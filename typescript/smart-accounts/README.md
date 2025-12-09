# Profiling Smart Accounts

Demo for deploying and invoking OpenZeppelin Stellar Smart Accounts with a delegated signer.

## Requirements

- [Deno](https://deno.land/)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)

## Run

```bash
# 1. Build contracts
stellar contract build

# 2. Deploy smart account and configure signer
deno task setup:basic

# 3. Execute transfer through smart account
deno task transfer:basic
```
