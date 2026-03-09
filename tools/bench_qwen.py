"""
Qwen 模型响应速度基准测试
用法: python tools/bench_qwen.py [--base-url URL] [--rounds N]

从项目根目录 .env 读取 QWEN_API_KEY 和 QWEN_BASE_URL。
"""

import os
import sys
import time
import argparse
from pathlib import Path

# Load .env from project root
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from openai import OpenAI

MODELS = [
    "qwen-plus",
    "qwen3-max",
    "qwen-turbo",
]

DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"

PROMPT = "Briefly explain what a binary search tree is in 2-3 sentences."


def bench_non_stream(client: OpenAI, model: str) -> dict:
    """Non-streaming: measure total latency and output length."""
    start = time.perf_counter()
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant. Reply concisely."},
            {"role": "user", "content": PROMPT},
        ],
        temperature=0.3,
        max_tokens=512,
    )
    elapsed = time.perf_counter() - start
    content = resp.choices[0].message.content or ""
    usage = resp.usage
    return {
        "latency_s": elapsed,
        "chars": len(content),
        "prompt_tokens": usage.prompt_tokens if usage else 0,
        "completion_tokens": usage.completion_tokens if usage else 0,
    }


def bench_stream(client: OpenAI, model: str) -> dict:
    """Streaming: measure TTFT, total time, and token count."""
    start = time.perf_counter()
    ttft = None
    token_count = 0
    total_chars = 0

    stream = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant. Reply concisely."},
            {"role": "user", "content": PROMPT},
        ],
        temperature=0.3,
        max_tokens=512,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            if ttft is None:
                ttft = time.perf_counter() - start
            token_count += 1
            total_chars += len(delta)

    total = time.perf_counter() - start
    tokens_per_sec = token_count / (total - (ttft or 0)) if total > (ttft or 0) else 0

    return {
        "ttft_s": ttft or 0,
        "total_s": total,
        "chunks": token_count,
        "chars": total_chars,
        "chunks_per_sec": tokens_per_sec,
    }


def fmt(val, unit="", width=8):
    if isinstance(val, float):
        return f"{val:>{width}.3f}{unit}"
    return f"{val:>{width}}{unit}"


def run(args):
    api_key = os.getenv("QWEN_API_KEY")
    if not api_key:
        print("Error: QWEN_API_KEY not found in .env", file=sys.stderr)
        sys.exit(1)

    base_url = args.base_url or os.getenv("QWEN_BASE_URL", DEFAULT_BASE_URL)
    client = OpenAI(api_key=api_key, base_url=base_url, timeout=120.0)

    print(f"Endpoint : {base_url}")
    print(f"Prompt   : {PROMPT}")
    print(f"Rounds   : {args.rounds}")
    print()

    # ── Non-streaming ──
    print("=" * 80)
    print("  NON-STREAMING")
    print("=" * 80)
    header = f"{'Model':<18} {'Latency':>9} {'Chars':>7} {'Prompt':>8} {'Completion':>11}"
    print(header)
    print("-" * len(header))

    for model in MODELS:
        latencies = []
        last = None
        for r in range(args.rounds):
            try:
                result = bench_non_stream(client, model)
                latencies.append(result["latency_s"])
                last = result
            except Exception as e:
                print(f"{model:<18} Round {r+1} ERROR: {e}")

        if latencies and last:
            avg_lat = sum(latencies) / len(latencies)
            print(
                f"{model:<18} {fmt(avg_lat, 's')} {fmt(last['chars'], '')} "
                f"{fmt(last['prompt_tokens'], '')} {fmt(last['completion_tokens'], '')}"
            )

    # ── Streaming ──
    print()
    print("=" * 80)
    print("  STREAMING")
    print("=" * 80)
    header = f"{'Model':<18} {'TTFT':>9} {'Total':>9} {'Chunks':>8} {'Chars':>7} {'Chunks/s':>10}"
    print(header)
    print("-" * len(header))

    for model in MODELS:
        ttfts = []
        totals = []
        last = None
        for r in range(args.rounds):
            try:
                result = bench_stream(client, model)
                ttfts.append(result["ttft_s"])
                totals.append(result["total_s"])
                last = result
            except Exception as e:
                print(f"{model:<18} Round {r+1} ERROR: {e}")

        if ttfts and last:
            avg_ttft = sum(ttfts) / len(ttfts)
            avg_total = sum(totals) / len(totals)
            print(
                f"{model:<18} {fmt(avg_ttft, 's')} {fmt(avg_total, 's')} "
                f"{fmt(last['chunks'], '')} {fmt(last['chars'], '')} "
                f"{fmt(last['chunks_per_sec'], '/s')}"
            )

    print()
    print("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Benchmark Qwen models response speed")
    parser.add_argument("--base-url", help="Override DashScope base URL")
    parser.add_argument("--rounds", type=int, default=2, help="Rounds per model (default: 2)")
    run(parser.parse_args())
