# WHERE Clause: Non-Aggregate vs Aggregate Conditions

**Created:** 4/28/2025, 3:16:39 PM
**Updated:** 4/28/2025, 3:51:46 PM
**Exported:** 6/13/2026, 4:05:33 AM
**Link:** [https://chat.deepseek.com/a/chat/s/2ae1f681-b8b1-4dc4-8829-f605b69d9fdb](https://chat.deepseek.com/a/chat/s/2ae1f681-b8b1-4dc4-8829-f605b69d9fdb)

---

## User
**2025-04-28T20:16:39.912Z**

Expressions coded in the WHERE clause


can use non-aggregate search conditions but can’t use aggregate search conditions

can use aggregate search conditions but can’t use non-aggregate search conditions

must refer to columns in the SELECT clause

can use either aggregate search conditions or non-aggregate search conditions

## DeepSeek
**2025-04-28T20:16:39.912Z**

The correct answer is:

**"can use non-aggregate search conditions but can’t use aggregate search conditions"**

Here's why:

In a WHERE clause:
1. You can use non-aggregate conditions (conditions that evaluate individual rows)
2. You cannot use aggregate conditions (conditions that evaluate groups of rows, like SUM, AVG, COUNT etc.)

Aggregate conditions belong in the HAVING clause, which is used to filter groups after they've been formed by the GROUP BY clause.

The other options are incorrect because:
- WHERE clauses don't allow aggregate conditions
- WHERE clauses can reference any column in the table(s), not just those in the SELECT clause
- They can't use "either" because aggregate conditions aren't allowed in WHERE clauses

## User
**2025-04-28T20:17:33.728Z**

Which of the statements below best describes the result set returned by this SELECT statement?
SELECT vendor_state, COUNT(*) AS column_2
FROM vendors
GROUP BY vendor_state
HAVING COUNT(*) > 1
ORDER BY vendor_state
Question 21 options:

The number of vendors in each state

The number of vendors in each state that has more than one vendor

The names of the vendors in each state

The duplicate vendors from each state

## DeepSeek
**2025-04-28T20:17:33.728Z**

The correct answer is:  

**"The number of vendors in each state that has more than one vendor"**  

### Explanation:  
The query:  
```sql
SELECT vendor_state, COUNT(*) AS column_2
FROM vendors
GROUP BY vendor_state
HAVING COUNT(*) > 1
ORDER BY vendor_state
```  
- **`GROUP BY vendor_state`** → Groups vendors by their state.  
- **`COUNT(*) AS column_2`** → Counts the number of vendors in each state.  
- **`HAVING COUNT(*) > 1`** → Filters to only include states with **more than one vendor**.  
- **`ORDER BY vendor_state`** → Sorts the results alphabetically by state.  

### Why the other options are wrong:  
- ❌ **"The number of vendors in each state"** → Incorrect because it doesn’t account for the `HAVING` clause, which excludes states with only one vendor.  
- ❌ **"The names of the vendors in each state"** → Incorrect because the query only returns the **state names and counts**, not individual vendor names.  
- ❌ **"The duplicate vendors from each state"** → Incorrect because the query does not identify duplicates; it only counts vendors per state and filters for states with multiple vendors.  

### Final Answer:  
✅ **The number of vendors in each state that has more than one vendor**

## User
**2025-04-28T20:18:51.396Z**

If two tables have a many-to-many relationship, which of the following do you typically use to relate their rows?

a master table

a linking table

an index in each table

a foreign key column in each table

## DeepSeek
**2025-04-28T20:18:51.396Z**

The correct answer is:  

**"a linking table"**  

### Explanation:  
In a **many-to-many relationship**, each row in **Table A** can relate to multiple rows in **Table B**, and vice versa. To properly model this:  

1. **A linking table (junction table/associative entity)** is created.  
2. This table contains **foreign keys** referencing the primary keys of both related tables.  
3. Each row in the linking table represents a relationship between one row in **Table A** and one row in **Table B**.  

### Why the other options are wrong:  
- ❌ **"a master table"** → A master table is typically used in a one-to-many relationship, not many-to-many.  
- ❌ **"an index in each table"** → Indexes improve performance but do not define relationships.  
- ❌ **"a foreign key column in each table"** → This would only work for **one-to-many** relationships (e.g., a `customer_id` in an `orders` table). In a many-to-many relationship, a single foreign key column in either table would not suffice.  

### Example:  
If you have **Students** and **Courses**, where a student can enroll in many courses and a course can have many students, you would create a **linking table** (e.g., `Enrollments`) with:  
- `student_id` (foreign key to Students)  
- `course_id` (foreign key to Courses)  

This structure allows tracking all valid student-course combinations.  

✅ **Correct Answer: A linking table**

## User
**2025-04-28T20:19:55.518Z**

When coded in a WHERE clause, which of the following search conditions will not return a result set that includes all invoices with an invoice_total value of $1000 or less?


invoice_total IN (0, 1000)

invoice_total BETWEEN 0 AND 1000

NOT (invoice_total > 1000)

invoice_total <= 1000

## DeepSeek
**2025-04-28T20:19:55.518Z**

The correct answer is:  

**"invoice_total IN (0, 1000)"**  

### Explanation:  
This condition **only returns invoices where `invoice_total` is exactly `0` or exactly `1000`**, not the full range of values **≤ 1000**.  

### Why the other options work for **≤ 1000**:  
1. **`invoice_total BETWEEN 0 AND 1000`** → Includes all values from **0 up to and including 1000**.  
2. **`NOT (invoice_total > 1000)`** → Equivalent to **`invoice_total <= 1000`**.  
3. **`invoice_total <= 1000`** → Directly checks for values **≤ 1000**.  

### Key Difference:  
- **`IN (0, 1000)`** → Only matches **exact values (0 or 1000)**.  
- The other options match **a continuous range (0 through 1000)**.  

✅ **Correct Answer: `invoice_total IN (0, 1000)`** (does **not** return all invoices ≤ $1000).

## User
**2025-04-28T20:20:41.070Z**

Which function concatenates a string with the specified separator string added in between?

LTRIM

SUBSTRING_INDEX

CONCAT_WS

CONCAT

## DeepSeek
**2025-04-28T20:20:41.070Z**

The correct answer is:  

**`CONCAT_WS`**  

### Explanation:  
- **`CONCAT_WS(separator, string1, string2, ...)`** → **Concatenates strings with a separator** in between each one.  
  - Example: `CONCAT_WS('-', '2023', '12', '01')` returns `"2023-12-01"`.  

### Why the other options are wrong:  
- ❌ **`LTRIM`** → Removes leading spaces from a string (not related to concatenation).  
- ❌ **`SUBSTRING_INDEX`** → Extracts a substring based on a delimiter (e.g., `SUBSTRING_INDEX('a-b-c', '-', 2)` returns `"a-b"`).  
- ❌ **`CONCAT`** → Joins strings **without a separator** (e.g., `CONCAT('A', 'B')` returns `"AB"`).  

### Key Difference:  
- **`CONCAT`** → No separator.  
- **`CONCAT_WS`** → **Includes a separator** between strings.  

✅ **Correct Answer: `CONCAT_WS`** (the only function that adds a separator while concatenating).

## User
**2025-04-28T20:21:55.033Z**

team_id      INT            NOT NULL    AUTO_INCREMENT,
team_name    VARCHAR(50),   
team_rank    INT            NOT NULL    DEFAULT 0
      
What are the values of the team_id, team_name, and team_rank columns after the following statement is executed, assuming that the Teams table has one row in it with a team_id of 1?
INSERT INTO teams (team_name)
VALUES ('Angels')


	
2, Angels, 1

1, Angels, 0

1, Angels, 1

2, Angels, 0

## DeepSeek
**2025-04-28T20:21:55.033Z**

The correct answer is:  

**`2, Angels, 0`**  

### Explanation:  
Given the table definition:  
```sql
team_id      INT            NOT NULL    AUTO_INCREMENT,  -- Auto-increments (starts at 1)
team_name    VARCHAR(50),   
team_rank    INT            NOT NULL    DEFAULT 0        -- Defaults to 0 if not provided
```  
And the current row:  
- `team_id = 1` (existing row)  

When executing:  
```sql
INSERT INTO teams (team_name) VALUES ('Angels')
```  
The values inserted will be:  
1. **`team_id`** → Auto-increments to **`2`** (next value after 1).  
2. **`team_name`** → **`'Angels'`** (explicitly provided).  
3. **`team_rank`** → **`0`** (default value since not specified).  

### Why the other options are wrong:  
- ❌ **`2, Angels, 1`** → Incorrect because `team_rank` defaults to `0`, not `1`.  
- ❌ **`1, Angels, 0`** → Incorrect because `team_id` auto-increments (cannot reuse `1`).  
- ❌ **`1, Angels, 1`** → Incorrect for both `team_id` (must increment) and `team_rank` (defaults to `0`).  

✅ **Correct Answer: `2, Angels, 0`**

## User
**2025-04-28T20:22:41.574Z**

Which of the following functions returns the smallest integer that is greater than or equal to the number?


CEILING

FLOOR

TRUNCATE

SIGN

## DeepSeek
**2025-04-28T20:22:41.574Z**

The correct answer is:  

**`CEILING`**  

### Explanation:  
- **`CEILING(number)`** → Returns the **smallest integer greater than or equal** to the given number.  
  - Example: `CEILING(3.2)` returns `4`.  
  - Example: `CEILING(-1.7)` returns `-1`.  

### Why the other options are wrong:  
- ❌ **`FLOOR(number)`** → Returns the **largest integer less than or equal** to the number.  
  - Example: `FLOOR(3.7)` returns `3`.  
- ❌ **`TRUNCATE(number, decimals)`** → Cuts off digits after a specified decimal place (does not round).  
  - Example: `TRUNCATE(5.78, 1)` returns `5.7`.  
- ❌ **`SIGN(number)`** → Returns `-1` (negative), `0` (zero), or `1` (positive).  
  - Example: `SIGN(-5)` returns `-1`.  

### Key Difference:  
- **`CEILING`** → Rounds **up** to the nearest integer.  
- **`FLOOR`** → Rounds **down** to the nearest integer.  

✅ **Correct Answer: `CEILING`** (the only function that rounds up to the next integer).

## User
**2025-04-28T20:24:23.345Z**

SELECT vendor_name, invoice_number
FROM invoices RIGHT JOIN vendors
  ON invoices.vendor_id = vendors.vendor_id
      
The total number of rows that are returned by this query must equal

the number of rows in the Invoices table

the number of rows in the Vendors table

the number of rows in the Invoices table plus the number of rows in the Vendors table

none of the above

## DeepSeek
**2025-04-28T20:24:23.345Z**

The correct answer is:  

**"the number of rows in the Vendors table"**  

### Explanation:  
- This query performs a **RIGHT JOIN** between `invoices` and `vendors` on `vendor_id`.  
- A **RIGHT JOIN** returns **all rows from the right table (`vendors`)** and only matching rows from the left table (`invoices`).  
- If a vendor has no invoices, those rows will still appear in the result with `NULL` for `invoice_number`.  
- Therefore, the total number of rows in the result **must equal the number of rows in the `vendors` table**.  

### Why the other options are wrong:  
❌ **"the number of rows in the Invoices table"** → Incorrect because a `RIGHT JOIN` includes **all vendors**, even those without invoices.  
❌ **"the number of rows in the Invoices table plus the number of rows in the Vendors table"** → Incorrect because it doesn’t sum rows; it matches them.  
❌ **"none of the above"** → Incorrect because the correct answer (number of vendors) is listed.  

### Key Takeaway:  
- **`RIGHT JOIN` guarantees all rows from the right table (`vendors`) are included**, so the result size matches the vendors table.  

✅ **Correct Answer: The number of rows in the Vendors table**

## User
**2025-04-28T20:25:02.505Z**

Which of the following statements best describes what this UPDATE statement does?
UPDATE invoices
SET credit_total = invoice_total - payment_total
WHERE vendor_id = 10
  AND invoice_total - payment_total - credit_total > 0


Updates the credit_total column for all invoices with a balance due so they don't have a balance due.

Updates the credit_total column for all invoices with a balance due so they don't have a balance due.

Updates the credit_total column for the first invoice with 10 in the vendor_id column and a balance so it doesn't have a balance due.

Updates the credit_total column for all invoices with 10 in the vendor_id column and a balance due so they don't have a balance due.

## DeepSeek
**2025-04-28T20:25:02.505Z**

The correct answer is:  

**"Updates the credit_total column for all invoices with 10 in the vendor_id column and a balance due so they don't have a balance due."**  

### Explanation:  
The `UPDATE` statement:  
```sql
UPDATE invoices
SET credit_total = invoice_total - payment_total
WHERE vendor_id = 10
  AND invoice_total - payment_total - credit_total > 0
```  
does the following:  
1. **Targets invoices** where:  
   - `vendor_id = 10`  
   - There is a **balance due** (`invoice_total - payment_total - credit_total > 0`).  
2. **Sets `credit_total = invoice_total - payment_total`**, which means:  
   - The new `credit_total` will cover the remaining balance (`invoice_total - payment_total`).  
   - After the update, `invoice_total - payment_total - credit_total` will be **0** (no balance due).  

### Why the other options are wrong:  
❌ **"Updates the credit_total column for all invoices with a balance due..."**  
   - Incorrect because it only applies to invoices **where `vendor_id = 10`**, not all invoices.  

❌ **"Updates the credit_total column for the first invoice with 10 in the vendor_id column..."**  
   - Incorrect because it updates **all qualifying invoices** for vendor 10, not just the first one.  

❌ **Repeated option (typo)**  
   - The first two options are identical and incorrect.  

### Key Takeaway:  
- The query **zeroes out the balance due** for **all unpaid invoices from vendor 10** by adjusting `credit_total`.  

✅ **Correct Answer: Updates `credit_total` for all invoices with `vendor_id = 10` and a balance due, eliminating the balance.**

## User
**2025-04-28T20:26:29.474Z**

Which of the following types of statements does not modify the data in a table?

SELECT

INSERT

UPDATE

DELETE

## DeepSeek
**2025-04-28T20:26:29.474Z**

The correct answer is:  

**`SELECT`**  

### Explanation:  
- **`SELECT`** → Only **retrieves** data from a table without modifying it.  
- **`INSERT`** → Adds new rows to a table (modifies data).  
- **`UPDATE`** → Changes existing data in a table.  
- **`DELETE`** → Removes rows from a table (modifies data).  

### Key Difference:  
- **`SELECT` is a read-only operation**, while `INSERT`, `UPDATE`, and `DELETE` are **data manipulation language (DML)** statements that alter table contents.  

✅ **Correct Answer: `SELECT` (does not modify data).**

## User
**2025-04-28T20:27:16.287Z**

To be in the first normal form, each cell in a table must contain

a single, scalar value

a non-redundant value

a non-unique value

a unique value

## DeepSeek
**2025-04-28T20:27:16.287Z**

The correct answer is:  

**"a single, scalar value"**  

### Explanation:  
**First Normal Form (1NF)** requires that:  
1. **Each cell contains a single, indivisible value (scalar value)**.  
   - No arrays, lists, or multiple values in one field.  
   - Example: A "phone_numbers" column storing `"555-1234, 555-5678"` violates 1NF. It should be split into separate rows.  

### Why the other options are wrong:  
❌ **"a non-redundant value"** → Redundancy is addressed in **higher normal forms (e.g., 2NF, 3NF)**, not 1NF.  
❌ **"a non-unique value"** → Uniqueness is irrelevant to 1NF (though primary keys must be unique).  
❌ **"a unique value"** → Uniqueness applies to keys, not individual cells.  

### Key Takeaway:  
1NF ensures **atomicity** (single values per cell).  

✅ **Correct Answer: a single, scalar value.**

## User
**2025-04-28T20:27:53.445Z**

Which of the following statements best describes what this INSERT statement does?
INSERT INTO invoices_copy
SELECT *
FROM invoices
WHERE terms_id = 1


Adds all of the rows in the Invoices table that have 1 in the terms_id column to the Invoices_Copy table.

Updates all of the rows in the Invoices_Copy table that have 1 in the terms_id column to the rows in the Invoices table.

Adds all of the rows in the Invoices table to the Invoices_Copy table and sets the terms_id column to 1 in each row.

Adds one row from the Invoices table to the Invoices_Copy table.

## DeepSeek
**2025-04-28T20:27:53.445Z**

The correct answer is:  

**"Adds all of the rows in the Invoices table that have 1 in the terms_id column to the Invoices_Copy table."**  

### Explanation:  
The `INSERT` statement:  
```sql
INSERT INTO invoices_copy
SELECT *
FROM invoices
WHERE terms_id = 1
```  
does the following:  
1. **Selects all rows** from the `invoices` table where `terms_id = 1`.  
2. **Inserts those rows** into the `invoices_copy` table.  

### Why the other options are wrong:  
❌ **"Updates all of the rows in the Invoices_Copy table..."**  
   - Incorrect because this is an `INSERT` (not an `UPDATE`).  

❌ **"Adds all of the rows in the Invoices table... and sets the terms_id column to 1"**  
   - Incorrect because it **filters** existing rows with `terms_id = 1` (does not modify values).  

❌ **"Adds one row from the Invoices table..."**  
   - Incorrect because it inserts **all matching rows**, not just one.  

### Key Takeaway:  
- The query **copies rows** from `invoices` to `invoices_copy` **where `terms_id = 1`**.  

✅ **Correct Answer: Adds all rows with `terms_id = 1` from `invoices` to `invoices_copy`.**

## User
**2025-04-28T20:30:43.060Z**

Code example

team_id      INT            NOT NULL    AUTO_INCREMENT,
team_name    VARCHAR(50),   
team_rank    INT            NOT NULL    DEFAULT 0
     
What are the values of the team_id, team_name, and team_rank columns after the following statement is executed, assuming that the Teams table has one row in it with a team_id of 1?
INSERT INTO teams
VALUES (DEFAULT, NULL, 3)


2, NULL, 1

0, NULL, 3

2, NULL, 3

0, NULL, 0

## DeepSeek
**2025-04-28T20:30:43.060Z**

The correct answer is:  

**`2, NULL, 3`**  

### Explanation:  

Given the table definition:  
```sql
team_id      INT            NOT NULL    AUTO_INCREMENT,  -- Auto-increments (starts at 1)
team_name    VARCHAR(50),                                -- Allows NULL  
team_rank    INT            NOT NULL    DEFAULT 0        -- Defaults to 0 if not provided
```  
And the current row:  
- `team_id = 1` (existing row)  

When executing:  
```sql
INSERT INTO teams
VALUES (DEFAULT, NULL, 3)
```  
The values inserted will be:  
1. **`team_id`** → `DEFAULT` triggers auto-increment, so it becomes **`2`** (next value after 1).  
2. **`team_name`** → Explicitly set to **`NULL`**.  
3. **`team_rank`** → Explicitly set to **`3`** (overrides the default of `0`).  

### Why the other options are wrong:  
❌ **`2, NULL, 1`** → Incorrect because `team_rank` is explicitly set to `3`, not `1`.  
❌ **`0, NULL, 3`** → Incorrect because `team_id` cannot be `0` (auto-increment starts at `1` and increments).  
❌ **`0, NULL, 0`** → Incorrect for both `team_id` (must auto-increment) and `team_rank` (set to `3`).  

### Key Points:  
- `DEFAULT` for `team_id` → Auto-increments to `2`.  
- `NULL` for `team_name` → Allowed (column is nullable).  
- `3` for `team_rank` → Overrides the default `0`.  

✅ **Correct Answer: `2, NULL, 3`**

## User
**2025-04-28T20:31:30.274Z**

A file that contains one or more SQL statements is called a


statement list

script

snippet

stored procedure

## DeepSeek
**2025-04-28T20:31:30.274Z**

The correct answer is:  

**"script"**  

### Explanation:  
- A **script** is a file containing **one or more SQL statements** that can be executed sequentially.  
- Scripts are commonly used to automate database tasks (e.g., creating tables, inserting data, or running updates).  

### Why the other options are wrong:  
❌ **"statement list"** → Not a standard term for SQL files.  
❌ **"snippet"** → Refers to small code fragments, not full files.  
❌ **"stored procedure"** → A precompiled database object stored *inside* the DBMS, not an external file.  

### Key Difference:  
- **Script** = External file with SQL commands.  
- **Stored procedure** = Database object saved *within* the database.  

✅ **Correct Answer: script**

## User
**2025-04-28T20:32:03.741Z**

If you assign an alias to one table in a join, you have to


use that alias to refer to the table throughout your query

qualify every column name in the query

assign them to all of the tables

qualify all of the column names for that table

## DeepSeek
**2025-04-28T20:32:03.741Z**

The correct answer is:  

**"use that alias to refer to the table throughout your query"**  

### Explanation:  
- When you assign an **alias** to a table in a join (e.g., `FROM customers AS c`), you **must consistently use that alias** (e.g., `c.customer_id`) everywhere else in the query.  
- Mixing the original table name and alias in the same query will cause an error.  

### Why the other options are wrong:  
❌ **"qualify every column name in the query"** → Not required unless columns are ambiguous (e.g., same name in multiple tables).  
❌ **"assign them to all of the tables"** → Optional; aliases can be used for just one table.  
❌ **"qualify all of the column names for that table"** → Only necessary if ambiguity exists.  

### Key Rule:  
- **Once an alias is defined, it replaces the table name everywhere in the query.**  

✅ **Correct Answer: use that alias to refer to the table throughout your query.**

## User
**2025-04-28T20:32:53.464Z**

In a cross join, all of the rows in the first table are joined with all of the


rows in the second table

unmatched columns in the second table

distinct rows in the second table

matched rows in the second table

## DeepSeek
**2025-04-28T20:32:53.464Z**

The correct answer is:  

**"rows in the second table"**  

### Explanation:  
A **CROSS JOIN** (also called a Cartesian join) combines **every row from the first table with every row from the second table**, resulting in:  
- **Total rows = (Rows in Table 1) × (Rows in Table 2)**  
- No matching condition (`ON` or `WHERE`) is required.  

### Example:  
If Table A has 3 rows and Table B has 2 rows, a `CROSS JOIN` returns **6 rows** (3 × 2).  

### Why the other options are wrong:  
❌ **"unmatched columns in the second table"** → Irrelevant; joins work on rows, not columns.  
❌ **"distinct rows in the second table"** → Duplicate rows are included unless explicitly filtered.  
❌ **"matched rows in the second table"** → `CROSS JOIN` doesn’t require matching—it joins **all** rows.  

### Key Takeaway:  
- **`CROSS JOIN` = All possible row combinations.**  

✅ **Correct Answer: rows in the second table.**

## User
**2025-04-28T20:33:32.159Z**

Which uses the least amount of storage?


'example' stored in a column of type CHAR(20)

'exam' stored in a column of type CHAR(20)

'ex' stored in a column of type CHAR(20)

they all use the same amount of storage

## DeepSeek
**2025-04-28T20:33:32.159Z**

The correct answer is:  

**"they all use the same amount of storage"**  

### Explanation:  
- **`CHAR(20)`** allocates **fixed-length storage** for 20 characters, **regardless of the actual string length**.  
  - `'example'` → Padded with spaces to 20 chars.  
  - `'exam'` → Padded with spaces to 20 chars.  
  - `'ex'` → Padded with spaces to 20 chars.  
- All three use **20 bytes** (assuming single-byte characters like ASCII) or **20 × character width** (e.g., 40 bytes for UTF-16).  

### Why the other options are wrong:  
❌ **"example" / "exam" / "ex"** → Incorrect because `CHAR` always reserves the full declared length.  

### Key Difference:  
- **`VARCHAR(20)`** would save space (stores only the actual string length + overhead).  
- **`CHAR(20)`** wastes space for short strings but ensures fixed-width storage.  

✅ **Correct Answer: They all use the same storage (20 characters).**

## User
**2025-04-28T20:34:11.267Z**

Which of the statements below best describes the result set returned by this SELECT statement?
SELECT COUNT(DISTINCT invoice_id) AS 'count',
       ROUND(AVG(line_item_amount), 2) AS average_amount
FROM invoice_line_items


A row for each of the invoices in the invoice_line_items table with a count of the line items and the average amount of the line items for that invoice

A single row with a count of the invoices in the invoice_line_items table and the average amount of all the line items

A single row with a count of the rows in the invoice_line_items table and the average amount of all the line items

## DeepSeek
**2025-04-28T20:34:11.267Z**

The correct answer is:  

**"A single row with a count of the invoices in the invoice_line_items table and the average amount of all the line items"**  

### Explanation:  
The query:  
```sql
SELECT COUNT(DISTINCT invoice_id) AS 'count',
       ROUND(AVG(line_item_amount), 2) AS average_amount
FROM invoice_line_items
```  
does the following:  
1. **`COUNT(DISTINCT invoice_id)`** → Counts **unique invoice IDs** (number of invoices, not line items).  
2. **`ROUND(AVG(line_item_amount), 2)`** → Calculates the **average amount across all line items**.  
3. Since there are **no `GROUP BY` clauses**, it returns a **single summary row** for the entire table.  

### Why the other options are wrong:  
❌ **"A row for each invoice..."** → Incorrect because there’s no `GROUP BY invoice_id` to split results by invoice.  
❌ **"A single row with a count of the rows..."** → Incorrect because `COUNT(DISTINCT invoice_id)` counts **invoices**, not rows.  

### Key Takeaway:  
- **Aggregate functions (`COUNT`, `AVG`) without `GROUP BY` return a single row summarizing the entire table.**  

✅ **Correct Answer: A single row with the invoice count and average line item amount.**

## User
**2025-04-28T20:35:41.899Z**

SELECT i.vendor_id, MAX(i.invoice_total) AS largest_invoice
FROM invoices i
    JOIN
      (SELECT vendor_id, AVG(invoice_total) AS average_invoice
      FROM invoices
      GROUP BY vendor_id
      HAVING AVG(invoice_total) > 100) ia
    ON i.vendor_id = ia.vendor_id
GROUP BY i.vendor_id
ORDER BY largest_invoice DESC

When this query is executed, the result table will contain one row for


each vendor

each vendor in the table named ia

each invoice

each invoice in the table named ia

## DeepSeek
**2025-04-28T20:35:41.899Z**

The correct answer is:  

**"each vendor in the table named ia"**  

### Explanation:  
The query performs the following steps:  
1. **Subquery (`ia`)** → Groups invoices by `vendor_id`, calculates the average invoice total, and filters for vendors with `AVG(invoice_total) > 100`.  
2. **Main query** → Joins the `invoices` table (`i`) with the subquery results (`ia`), ensuring only vendors from `ia` (those with average invoice > 100) are included.  
3. **`GROUP BY i.vendor_id`** → Groups the joined data by `vendor_id`, returning **one row per vendor** (specifically, vendors from `ia`).  
4. **`MAX(i.invoice_total)`** → Finds the largest invoice for each qualifying vendor.  

### Why the other options are wrong:  
❌ **"each vendor"** → Incorrect because only vendors with `average_invoice > 100` (from subquery `ia`) are included.  
❌ **"each invoice"** → Incorrect because the `GROUP BY` collapses results to one row per vendor, not per invoice.  
❌ **"each invoice in the table named ia"** → Incorrect because `ia` contains vendors (not invoices), and the main query groups by vendor.  

### Key Takeaway:  
- The result includes **only vendors from the subquery (`ia`)** that meet the `AVG(invoice_total) > 100` condition.  

✅ **Correct Answer: each vendor in the table named ia.**

## User
**2025-04-28T20:36:21.099Z**

What is the result of the function that follows?
ROUND(2857.83457, -2)


2857.834

2857.83

2900

2900.83457

## DeepSeek
**2025-04-28T20:36:21.099Z**

The correct answer is:  

**`2900`**  

### Explanation:  
The `ROUND(2857.83457, -2)` function works as follows:  
1. **`-2`** means rounding to the **nearest 100** (10², since the second argument is negative).  
2. **2857.83457** rounded to the nearest 100 is **2900** (because 2857 is closer to 2900 than to 2800).  

### Why the other options are wrong:  
❌ **2857.834** → Incorrect because this would require `ROUND(2857.83457, 3)` (rounding to 3 decimal places).  
❌ **2857.83** → Incorrect because this would require `ROUND(2857.83457, 2)` (rounding to 2 decimal places).  
❌ **2900.83457** → Incorrect because rounding to `-2` affects digits **left of the decimal**, not right.  

### Key Rule:  
- **Negative precision in `ROUND()`** rounds to the left of the decimal (e.g., `-1` = tens, `-2` = hundreds).  

✅ **Correct Answer: 2900** (rounded to the nearest hundred).

## User
**2025-04-28T20:37:40.799Z**

If introduced as follows, the subquery can return which of the values listed below?
SELECT (subquery)


a single value

a list of values

a table of values

a subquery can’t be introduced in this way

## DeepSeek
**2025-04-28T20:37:40.799Z**

The correct answer is:  

**"a single value"**  

### Explanation:  
When a subquery is used in a `SELECT` clause like this:  
```sql
SELECT (subquery)
```  
it **must return exactly one row and one column** (a single scalar value). This is because the result is treated as a single cell in the output.  

### Why the other options are wrong:  
❌ **"a list of values"** → Not allowed; would cause an error (e.g., "Subquery returns more than 1 row").  
❌ **"a table of values"** → Not allowed; the subquery must return a single value, not multiple columns/rows.  
❌ **"a subquery can’t be introduced in this way"** → Incorrect; this syntax is valid **if the subquery returns one value**.  

### Example:  
Valid (returns one value):  
```sql
SELECT (SELECT MAX(price) FROM products) AS max_price;
```  
Invalid (returns multiple rows):  
```sql
SELECT (SELECT product_name FROM products); -- Error!
```  

✅ **Correct Answer: a single value.**

## User
**2025-04-28T20:38:12.766Z**

If two tables have a one-to-many relationship, which of the following do you typically need to add to the table on the “many” side?


an indexed column

a foreign key column

a linking column

a primary key column

## DeepSeek
**2025-04-28T20:38:12.766Z**

The correct answer is:  

**"a foreign key column"**  

### Explanation:  
In a **one-to-many relationship**:  
1. The table on the **"many" side** must include a **foreign key column** that references the **primary key** of the table on the "one" side.  
2. This ensures referential integrity and establishes the relationship.  

### Example:  
- **One `Customer` can have many `Orders`.**  
- The `Orders` table (many side) includes a **`customer_id` foreign key** referencing the `Customers` table.  

### Why the other options are wrong:  
❌ **"an indexed column"** → Indexes improve performance but don’t define relationships.  
❌ **"a linking column"** → Ambiguous term; the correct term is **foreign key**.  
❌ **"a primary key column"** → The "many" side already has its own primary key; the foreign key points to the "one" side.  

### Key Takeaway:  
- **Foreign keys enforce one-to-many relationships.**  

✅ **Correct Answer: a foreign key column.**

## User
**2025-04-28T20:38:37.697Z**

When you code a SELECT statement, you must code the four main clauses in the following order


SELECT, FROM, WHERE, ORDER BY

SELECT, FROM, ORDER BY, WHERE

SELECT, WHERE, ORDER BY, FROM

SELECT, ORDER BY, FROM, WHERE

## DeepSeek
**2025-04-28T20:38:37.697Z**

The correct answer is:  

**"SELECT, FROM, WHERE, ORDER BY"**  

### Explanation:  
The **mandatory order** for the four main clauses in a `SELECT` statement is:  
1. **`SELECT`** → Specifies the columns to retrieve.  
2. **`FROM`** → Specifies the table(s) to query.  
3. **`WHERE`** → Filters rows (optional but must come after `FROM`).  
4. **`ORDER BY`** → Sorts the result set (optional but must come last).  

### Why the other options are wrong:  
❌ **`SELECT, FROM, ORDER BY, WHERE`** → Invalid because `WHERE` must come before `ORDER BY`.  
❌ **`SELECT, WHERE, ORDER BY, FROM`** → Invalid because `FROM` must come before `WHERE`.  
❌ **`SELECT, ORDER BY, FROM, WHERE`** → Invalid because `ORDER BY` must be last.  

### Key Rule:  
- **`SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY`** (only `SELECT` and `FROM` are mandatory).  

✅ **Correct Answer: SELECT, FROM, WHERE, ORDER BY.**

## User
**2025-04-28T20:42:05.043Z**

Which of the following types of SQL statements is not a DML statement?


INSERT

UPDATE

SELECT

CREATE TABLE

## DeepSeek
**2025-04-28T20:42:05.043Z**

The correct answer is:  

**"CREATE TABLE"**  

### Explanation:  
- **DML (Data Manipulation Language)** statements modify or retrieve data within existing tables. These include:  
  - `SELECT` (retrieves data)  
  - `INSERT` (adds data)  
  - `UPDATE` (modifies data)  
  - `DELETE` (removes data)  
- **`CREATE TABLE`** is a **DDL (Data Definition Language)** statement, which defines or alters database structures (e.g., tables, indexes).  

### Why the other options are wrong:  
❌ **`INSERT`**, **`UPDATE`**, and **`SELECT`** are all DML statements.  

### Key Difference:  
- **DML** works with data (e.g., querying or modifying rows).  
- **DDL** works with database structures (e.g., creating tables).  

✅ **Correct Answer: `CREATE TABLE` (a DDL statement, not DML).**

## User
**2025-04-28T20:43:15.240Z**

If the current date is 2019-02-10, what value is returned by the function that follows?
MONTH(CURDATE())


February

February 2019

2

Feb

## DeepSeek
**2025-04-28T20:43:15.240Z**

The correct answer is:  

**`2`**  

### Explanation:  
The function works as follows:  
1. **`CURDATE()`** returns the current date (`2019-02-10`).  
2. **`MONTH()`** extracts the **numeric month** from the date (February = `2`).  

### Why the other options are wrong:  
❌ **"February"** → `MONTH()` returns a number, not the month name (use `MONTHNAME()` instead).  
❌ **"February 2019"** → Incorrect format; `MONTH()` only returns the month number.  
❌ **"Feb"** → Abbreviated names aren’t returned by `MONTH()` (use `DATE_FORMAT()` for this).  

### Key Takeaway:  
- **`MONTH(date)`** → Returns **1-12** (January = 1, December = 12).  
- For names, use `MONTHNAME(date)` (e.g., "February").  

✅ **Correct Answer: 2.**

## User
**2025-04-28T20:43:46.468Z**

How would you identify the many side of a relationship between two tables in a database?


By defining a foreign key in one table that’s related to a foreign key in the other table

By defining a foreign key in one table that’s related to the primary key in the other table

By defining a primary key in one table that’s related to the primary key in the other table

By defining a primary key in one table that’s related to a unique key in the other table

## DeepSeek
**2025-04-28T20:43:46.468Z**

The correct answer is:  

**"By defining a foreign key in one table that’s related to the primary key in the other table"**  

### Explanation:  
In a **one-to-many relationship**:  
1. The **"many" side** is identified by a **foreign key column** that references the **primary key** of the "one" side.  
2. Example:  
   - **`Customers` (one side)** has a primary key `customer_id`.  
   - **`Orders` (many side)** includes `customer_id` as a foreign key to link multiple orders to one customer.  

### Why the other options are wrong:  
❌ **"Foreign key related to another foreign key"** → Creates a many-to-many relationship (requires a **linking table**).  
❌ **"Primary key related to another primary key"** → Impossible; primary keys must be unique per table.  
❌ **"Primary key related to a unique key"** → Redundant; unique keys behave like primary keys in relationships.  

### Key Takeaway:  
- **Foreign key → Primary key** = Standard one-to-many relationship.  

✅ **Correct Answer: By defining a foreign key in one table that’s related to the primary key in the other table.**

## User
**2025-04-28T20:45:46.228Z**

When coded in a WHERE clause, which of the following would not return rows for vendors in the cities of San Diego and Santa Ana?


vendor_city REGEXP 'NA$'

vendor_city LIKE 'SAN%'

vendor_city REGEXP '^SA'

## DeepSeek
**2025-04-28T20:45:46.228Z**

The correct answer is:  

**"vendor_city REGEXP 'NA$'"**  

### Explanation:  
1. **`vendor_city REGEXP 'NA$'`** → Matches cities **ending with "NA"** (e.g., "Santa Ana"), but **not "San Diego"**.  
   - ✅ **"Santa Ana"** matches.  
   - ❌ **"San Diego"** does **not** match (ends with "ego").  

2. **Why the other options work for both cities**:  
   - **`vendor_city LIKE 'SAN%'`** → Matches cities starting with "SAN" (both "San Diego" and "Santa Ana").  
   - **`vendor_city REGEXP '^SA'`** → Matches cities starting with "SA" (both "San Diego" and "Santa Ana").  

### Key Takeaway:  
- **`'NA$'`** fails to match "San Diego", making it the only option that excludes one of the cities.  

✅ **Correct Answer: `vendor_city REGEXP 'NA$'`** (does not return both cities).

## User
**2025-04-28T20:46:58.550Z**

SELECT invoice_number, invoice_date,
  CASE
    WHEN (SYSDATE() - invoice_date) >= 30 AND (SYSDATE() - invoice_date) < 60
      THEN invoice_total
    ELSE 0
  END AS "30-60",
  CASE
    WHEN (SYSDATE() - invoice_date) >= 60 AND (SYSDATE() - invoice_date) < 90
      THEN invoice_total
    ELSE 0
  END AS "60-90",
  CASE
    WHEN (SYSDATE() - invoice_date) > 90 THEN invoice_total
    ELSE 0
  END AS "Over 90"
FROM invoices


Displays three columns for each invoice with one of these messages in the third column: 30-60, 60-90, or Over 90.

Displays three columns for each invoice with a value in the third column that indicates how many days have elapsed between the invoice date and the current date.

Displays five columns for each invoice with the invoice total in one of the last three columns based on how many days have elapsed between the invoice date and the current date.

Displays five columns for each invoice with a message in one of the last three columns based on how many days have elapsed between the invoice date and the current date.

## DeepSeek
**2025-04-28T20:46:58.550Z**

The correct answer is:  

**"Displays five columns for each invoice with the invoice total in one of the last three columns based on how many days have elapsed between the invoice date and the current date."**  

### Explanation:  
The query:  
1. **Selects `invoice_number` and `invoice_date`** (first two columns).  
2. **Creates three additional columns** (`30-60`, `60-90`, `Over 90`) using `CASE` statements:  
   - Each `CASE` checks the days elapsed (`SYSDATE() - invoice_date`).  
   - If the condition is met, it shows the **`invoice_total`**; otherwise, it shows **`0`**.  
3. **Result**:  
   - **5 columns total** (`invoice_number`, `invoice_date`, `30-60`, `60-90`, `Over 90`).  
   - Only **one of the last three columns** will contain the `invoice_total` (the others will show `0`), depending on the days elapsed.  

### Why the other options are wrong:  
❌ **"Displays three columns..."** → Incorrect because the query outputs **5 columns**, not 3.  
❌ **"Indicates how many days have elapsed"** → Incorrect because the `CASE` logic categorizes days into ranges, not counts.  
❌ **"Displays a message..."** → Incorrect because the columns contain **numeric values** (`invoice_total` or `0`), not text messages.  

### Key Takeaway:  
- The query **categorizes invoices by age** (30-60, 60-90, or >90 days) and displays the `invoice_total` in the relevant column.  

✅ **Correct Answer: Displays five columns with `invoice_total` in one of the last three columns based on days elapsed.**

## User
**2025-04-28T20:48:21.074Z**

Which of the following statements best describes what the following SELECT statement does?
SELECT ROW_NUMBER() OVER(PARTITION BY invoice_date
    ORDER BY invoice_total) AS 'row_number', invoice_date, invoice_total
FROM invoices


Assigns a number to each row that indicates the position of an invoice date relative to all rows returned.

Assigns a number to each row that indicates the position of an invoice date within the rows for an invoice total.

Assigns a number to each row that indicates the position of the invoice total within the rows for an invoice date.

Assigns a number to each row that indicates the position of an invoice total relative to all rows returned.

## DeepSeek
**2025-04-28T20:48:21.074Z**

The correct answer is:  

**"Assigns a number to each row that indicates the position of the invoice total within the rows for an invoice date."**  

### Explanation:  
The query:  
```sql
SELECT ROW_NUMBER() OVER(PARTITION BY invoice_date ORDER BY invoice_total) AS 'row_number', 
       invoice_date, 
       invoice_total
FROM invoices
```  
does the following:  
1. **`PARTITION BY invoice_date`** → Groups rows by `invoice_date`.  
2. **`ORDER BY invoice_total`** → Orders rows within each partition by `invoice_total` (ascending by default).  
3. **`ROW_NUMBER()`** → Assigns a sequential number to each row **within its partition**, starting at 1.  

### Key Behavior:  
- For **each unique `invoice_date`**, the query:  
  - Sorts rows by `invoice_total`.  
  - Assigns a row number (1, 2, 3...) based on the order of `invoice_total`.  

### Why the other options are wrong:  
❌ **"Position of an invoice date relative to all rows"** → Incorrect because partitioning is by `invoice_date`, not ranking dates globally.  
❌ **"Position of an invoice date within rows for an invoice total"** → Incorrect because ordering is by `invoice_total`, not `invoice_date`.  
❌ **"Position of invoice total relative to all rows"** → Incorrect because row numbers reset for each `invoice_date` partition.  

### Example:  
If two invoices share the same `invoice_date`, their row numbers will be `1` and `2` based on their `invoice_total` values.  

✅ **Correct Answer: Assigns a number indicating the position of `invoice_total` within rows for each `invoice_date`.**

## User
**2025-04-28T20:51:31.842Z**

If the column named float_value is a DOUBLE type, which of the following queries will not return values that are approximately equal to 5?


SELECT float_value
FROM float_sample
WHERE float_value = 5

SELECT float_value
FROM float_sample
WHERE float_value BETWEEN 4.99 AND 5.01

SELECT float_value
FROM float_sample
WHERE ROUND(float_value, 2) = 5.00

## DeepSeek
**2025-04-28T20:51:31.842Z**

The correct answer is:  

**"SELECT float_value FROM float_sample WHERE float_value = 5"**  

### Explanation:  
1. **`DOUBLE` is a floating-point type**, which means it stores approximate values.  
2. **`float_value = 5`** will **fail** to match values like `4.99999999` or `5.00000001` due to precision limitations.  
3. The other options work because:  
   - **`BETWEEN 4.99 AND 5.01`** → Captures values *near* 5.  
   - **`ROUND(float_value, 2) = 5.00`** → Rounds to two decimal places before comparison.  

### Key Takeaway:  
- **Never use `=` with floating-point numbers**—use ranges or rounding instead.  

✅ **Correct Answer: `SELECT float_value FROM float_sample WHERE float_value = 5`** (will miss approximate values).

