import * as anchor from '@coral-xyz/anchor'
import crypto from 'crypto'
import bs58 from 'bs58'

async function main() {
  const phantomSecret = '3D86YvFeKqo4tDAtdYhbdxRJm5ZqPGu2XmA895dpHmCky17hGTtYLEBVAr34DJx3jbfpRspeR1k9TesNkVhxTdnc'
  const adminKeypair = anchor.web3.Keypair.fromSecretKey(bs58.decode(phantomSecret))
  const connection = new anchor.web3.Connection('http://127.0.0.1:8899', 'confirmed')

  console.log('💰 Airdropping SOL...')
  const sig = await connection.requestAirdrop(adminKeypair.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
  await connection.confirmTransaction(sig, 'confirmed')
  console.log('Balance:', await connection.getBalance(adminKeypair.publicKey))

  const programId = new anchor.web3.PublicKey('CJQhZqq1X6EC2wE2sUYZAczqQSBvYs9DZGkrs8AQiRxB')
  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('config')], programId)


  const hash = crypto.createHash('sha256').update('global:initialize_config').digest()
  const discriminator = hash.subarray(0, 8)

  const instruction = new anchor.web3.TransactionInstruction({
    programId: programId,
    keys: [
      { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(discriminator),
  })

  try {
    const transaction = new anchor.web3.Transaction().add(instruction)
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    transaction.feePayer = adminKeypair.publicKey

    // Explicitly sign it here
    transaction.sign(adminKeypair)
    const rawTx = transaction.serialize()

    const signature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })


    const confirmation = await connection.confirmTransaction(signature, 'confirmed')

    if (confirmation.value.err) {
      console.error('❌ Confirmation returned a transaction error!', confirmation.value.err)
    } else {
      console.log('\n==================================================')
      console.log('✨ SUCCESS! Transaction confirmed by validator.')
      console.log(`📝 Signature: ${signature}`)
      console.log('==================================================')
    }
  } catch (error: any) {
    console.log('\n==================================================')
    console.error('❌ CRITICAL SCRIPT ERROR CAUGHT:')
    console.error('📝 Message:', error.message || error)
    if (error.logs) {
      console.error('📋 Validator Program Logs:', error.logs)
    }
    console.log('==================================================')
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
})

main()
