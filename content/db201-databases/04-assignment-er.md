# Assignment 1: ER modelling

Design an ER diagram for a small public library, then write the relational mapping.

Submit before 23:59 on 14 October 2026. PDF of the diagram plus a one-page mapping table. Pair work is not allowed for this brief.

## Domain

Members borrow copies of books. A book has an ISBN, a title, and one or more authors. A copy has a barcode and a condition. A loan has a start date and a due date. Staff can also be members. Some members are children and must have a guardian who is an adult member.

Fines accrue when a copy is returned after the due date. You do not need to model payments.

## What we mark

- Entity vs attribute choices (author is not a string on Book).
- Cardinalities that match the prose, including the guardian relationship.
- A clean mapping: keys, foreign keys, and junction tables where the diagram is many-to-many.
- No unexplained redundant attributes.

A diagram that looks pretty and cannot answer “can two copies share a barcode?” will not pass.

Late work loses 10% per day. After three days the assignment is closed.
