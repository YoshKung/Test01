"""
Databricks Business ERD Dashboard (single-cell style script)

This standalone file is intentionally self-contained so it can be pasted into
one Databricks notebook cell or run as a local Python script.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class TableNode:
    """Represents a table in an ERD graph."""

    name: str
    domain: str


@dataclass(frozen=True)
class RelationEdge:
    """Represents a relationship between two tables."""

    source: str
    target: str
    relation: str = "FK"


def sample_nodes() -> list[TableNode]:
    """Initial sample dataset for dashboard development."""
    return [
        TableNode("dim_customer", "sales"),
        TableNode("dim_product", "sales"),
        TableNode("fact_order", "sales"),
        TableNode("fact_payment", "finance"),
    ]


def sample_edges() -> list[RelationEdge]:
    """Initial sample relationships for dashboard development."""
    return [
        RelationEdge("fact_order", "dim_customer"),
        RelationEdge("fact_order", "dim_product"),
        RelationEdge("fact_payment", "fact_order"),
    ]


def to_mermaid(nodes: Iterable[TableNode], edges: Iterable[RelationEdge]) -> str:
    """Render ERD-like relationships in Mermaid flowchart syntax."""
    lines: list[str] = ["flowchart LR"]

    seen: set[str] = set()
    for node in nodes:
        if node.name not in seen:
            lines.append(f"    {node.name}[{node.name}\\n({node.domain})]")
            seen.add(node.name)

    for edge in edges:
        lines.append(f"    {edge.source} -->|{edge.relation}| {edge.target}")

    return "\n".join(lines)


def main() -> None:
    nodes = sample_nodes()
    edges = sample_edges()
    diagram = to_mermaid(nodes, edges)

    print("Databricks Business ERD Dashboard (Starter)")
    print("=" * 45)
    print(f"tables: {len(nodes)}")
    print(f"relations: {len(edges)}")
    print("\nMermaid diagram:\n")
    print(diagram)


if __name__ == "__main__":
    main()
