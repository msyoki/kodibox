# 0006. Defer audit_events partitioning

- Status: Accepted
- Date: 2026-11-02

## Context
DATA_MODEL.md planned monthly partitions for `audit_events`. The table currently has a single-column primary key (`id`, uuidv7). Declarative partitioning requires the partition key (`at`) in every unique constraint, so the PK would become `(id, at)`, and converting a populated table means a full rewrite and a lock window. Early volume is small, and the hash chain and immutability work (E-06) will touch the same table.

## Decision
Keep `audit_events` as one unpartitioned table, indexed on `(organization_id, at)`, `(actor_user_id)` and `(organization_id, entity_type, entity_id, at desc)`. Revisit monthly range partitioning on `at` once volume warrants it (for example tens of millions of rows or retention drops becoming painful), via an expand/contract migration with the PK changed to `(id, at)`.

Related items stay out of this ADR: owner-level trigger disabling and a NOT NULL hash chain are handled in E-06; binding the actor to `app.current_user_id` is handled in E-04/E-06.

## Consequences
- Simpler schema and FKs now; no PK change until it is needed.
- A later partitioning migration costs a rewrite (or a new partitioned table plus backfill and swap), and any FK referencing `audit_events(id)` would have to change.
- Retention deletes are not partition drops until then, and the append-only trigger blocks them anyway; retention will need an explicit, audited path.
