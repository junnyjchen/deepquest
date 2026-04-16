# DQProject Smart Contract

DeepQuest DeFi Platform on Solana Blockchain.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Blockchain | Solana |
| Language | Rust |
| Framework | Anchor 0.30.0 |
| Token Standard | SPL Token |
| DEX | Raydium V2 |

## Project Structure

```
contracts/
├── src/
│   └── lib.rs                 # Main program
├── Cargo.toml                  # Rust dependencies
├── Anchor.toml                 # Anchor configuration
├── idl/
│   └── dq_project.json        # IDL definition
├── tests/
│   └── dq_project.ts          # Integration tests
└── scripts/
    └── *.ts                   # Deployment scripts
```

## Build

```bash
# Build
anchor build

# Deploy
anchor deploy

# Test
anchor test
```

## Program ID

```
DQProject111111111111111111111111111111111
```

## Features

- [x] SOL ↔ DQ Token Swap
- [x] DQ Staking (30/90/180/360 days)
- [x] Node NFT (A/B/C tiers)
- [x] Daily Block Mining
- [x] Partner System
- [x] Multi-tier Rewards

## License

MIT
