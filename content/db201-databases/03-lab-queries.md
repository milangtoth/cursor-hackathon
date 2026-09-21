# Lab 3: Writing queries

This lab is formative. You still have to hand it in. Students who skip it tend to fail the midterm on joins.

Work on the `library` schema from the lab zip. Do not invent your own tables; the autograder expects those names.

## Queries

1. List titles that have never been borrowed.
2. For each member, the number of loans in 2026, including members with zero.
3. The most borrowed ISBN in each category.
4. Members who borrowed a book that another member with the same postcode also borrowed, but not the same copy on the same day.

Query 4 is the one that tells us whether you understood self-joins. A nested `IN` that returns the whole table is not a solution.

## Practicalities

Submit a single `lab3.sql` file with the four statements in order, each ending with a semicolon.

Hand in Lab 3 by 23:59 on 21 October 2026. The portal is the only accepted channel. You must have a recorded submission before the midterm on 2 November.

We will not extract this date into the agenda automatically. Use the **Extract tasks from this document** button on the material page if you want it there — that is the live path we show in the demo, and it is also how a teacher would pull tasks out of a late-added brief.
