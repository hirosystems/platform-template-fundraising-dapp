# STX/sBTC Fundraising App

This is a simple crypto fundraising web page built on Stacks. It lets people run a ~1-month-long campaign to raise funds in STX and sBTC. It's built with two contracts that work together:

### `fundraising.clar`

Handles the core campaign logic.

- Allows the contract owner to initialize the campaign with a fundraising goal in USD
- Accepts donations in STX or sBTC
- Tracks individual contributions
- Allows refunds to donors if the goal isn't hit after 30 days
- Lets the beneficiary (contract owner) withdraw the raised funds if the goal is hit

### `price-feed.clar`

A basic price oracle.

- Stores current prices for STX and sBTC in USD
- Lets an authorized address update prices
- Errors if prices get too stale (>24h old)

The fundraising contract uses the price feed to convert crypto donations into USD value to check if campaigns hit their goals. You'll need to run a script to call `price-feed.clar` regularly to keep the prices updated.