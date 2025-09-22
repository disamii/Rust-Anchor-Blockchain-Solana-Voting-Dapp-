import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { Voting } from "../target/types/voting";

const IDL = require("../target/idl/voting.json");
const votingProgramId = new PublicKey("Bv9Ass1iv6qoT6VYrhBCsHhCsQqn7hptP5RTNjjJtBag");

describe("Voting", () => {
  let context;
  let provider;
  anchor.setProvider(anchor.AnchorProvider.env());
  let program = anchor.workspace.Voting as Program<Voting>;

  beforeAll(async () => {
    // context = await startAnchor("", [{ name: "voting", programId: votingProgramId }], []);
    // provider = new BankrunProvider(context);
    // program = new Program<Voting>(IDL, provider);
  });

  //jest.setTimeout(20000);

  it("Initializes the poll", async () => {
    await program.methods
      .initializePoll(
        new anchor.BN(1), // pollId
        "What is your favorite type of peanut Butter?", // description
        new anchor.BN(0), // start time
        new anchor.BN(1758484403) // end time
      )
      .rpc();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      votingProgramId
    );

    const poll = await program.account.poll.fetch(pollAddress);

    console.log("Fetched poll:", poll);

    expect(poll.pollId.toNumber()).toEqual(1);
    expect(poll.description).toEqual("What is your favorite type of peanut Butter?");
    expect(poll.pollStart.toNumber()).toBeLessThan(poll.pollEnd.toNumber());
  });

  it("Initializes candidates", async () => {
    await program.methods
      .initializeCandidate("Smooth", new anchor.BN(1))
      .rpc();

    await program.methods
      .initializeCandidate("Crunchy", new anchor.BN(1))
      .rpc();

    const [crunchyAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Crunchy")],
      votingProgramId,
    );
    
    const crunchyCandidate = await program.account.candidate.fetch(crunchyAddress);
    console.log(crunchyCandidate);
    expect(crunchyCandidate.candidateVotes.toNumber()).toEqual(0);

    const [smoothAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Smooth")],
      votingProgramId,
    );
    
    const smoothCandidate = await program.account.candidate.fetch(smoothAddress);
    console.log(smoothCandidate);
    expect(smoothCandidate.candidateVotes.toNumber()).toEqual(0);
  });

  it("Votes for a candidate", async () => {
    await program.methods
    .vote(
      "Smooth",
      new anchor.BN(1)
    )
    .rpc();

    const [smoothAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Smooth")],
      votingProgramId,
    );
    
    const smoothCandidate = await program.account.candidate.fetch(smoothAddress);
    console.log(smoothCandidate);
    expect(smoothCandidate.candidateVotes.toNumber()).toEqual(1);

  });
});
