# Test Data Population Script

This script populates the database with dummy borrowers, loans, and fixed income assets for testing the filtering and sorting functionality.

## Usage

Run the test data population script:

```bash
bun run populate-test-data
```

## What it creates

### 8 Borrowers
- Naruto Uzumaki
- Sakura Haruno
- Sasuke Uchiha
- Kakashi Hatake
- Hinata Hyuga
- Shikamaru Nara
- Gaara
- Tsunade Senju

### 8 Loans with Different Intervals
- **Monthly loans** (₹5,00,000 - ₹10,00,000)
- **Quarterly loan** (₹7,50,000)
- **Bi-weekly loan** (₹1,50,000)
- **Semi-annual loan** (₹8,00,000)
- **Annual loan** (₹20,00,000)

Loan types include both **installment** and **bullet** loans with various interest rates (8% - 18%).

### 5 Fixed Income Assets
- **Land lease** agreements (₹50,00,000 & ₹80,00,000)
- **Rent agreements** (₹30,00,000 & ₹25,00,000)
- **Fixed deposit income** (₹10,00,000)

With payment intervals: monthly, quarterly, and annual.

## Testing the Features

After running this script, you can test:

### Filters
- **Borrower filter**: Filter by any of the 8 borrowers
- **Interval filter**: Monthly, Quarterly, Bi-weekly, Semi-annual, Annual
- **Status filter**: All created items will be "active"
- **Search**: Search by borrower names or asset types

### Sorting
- **By Date**: Default sort (earliest to latest)
- **By Amount**: Sort by payment amounts
- **By Borrower**: Alphabetical sort by borrower name

## Database Location

The SQLite database is created at:
```
~/Library/Application Support/com.deepaktammali.lendvibe/lending.db
```

## Performance

This script uses Bun's native `bun:sqlite` driver for high-performance database operations. It's significantly faster than other SQLite drivers for bulk inserts.

## Note

- All loans are created with "active" status
- All fixed incomes are created with "active" status
- Various repayment intervals ensure comprehensive testing
- Anime character names are used for testing
- Amounts are in Indian Rupees (₹)
- Uses Bun's native SQLite for optimal performance