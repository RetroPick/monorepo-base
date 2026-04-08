_colosseum$ # Generate a new keypair for the program
solana-keygen new -o target/deploy/retropick_market_engine_colosseum-keypair.json --no-bip39-passphrase

# Get the new program ID
solana address -k target/deploy/retropick_market_engine_colosseum-keypair.json
Generating a new keypair
Wrote new keypair to target/deploy/retropick_market_engine_colosseum-keypair.json
==========================================================================
pubkey: DtAXgAgpV8SDnEduZejZTbtA37ZxGAywUwoyzpbyXK8o
==========================================================================
Save this seed phrase to recover your new keypair:
swamp wife tube marble genuine switch mansion math answer ahead wrong wrap
==========================================================================
DtAXgAgpV8SDnEduZejZTbtA37ZxGAywUwoyzpbyXK8o