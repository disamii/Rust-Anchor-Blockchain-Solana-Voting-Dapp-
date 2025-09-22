import { ActionGetResponse, ACTIONS_CORS_HEADERS, ActionPostRequest, createPostResponse } from "@solana/actions";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Voting } from "@/../anchor/target/types/voting"
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";

const IDL = require("@/../anchor/target/idl/voting.json")

export const OPTIONS = GET;

export async function GET(request: Request) {
    const actionMetadata: ActionGetResponse = {
        icon: "https://media.istockphoto.com/id/1051092868/photo/peanut-paste-in-an-open-jar-and-peanuts.webp?s=2048x2048&w=is&k=20&c=fStLtNtcFRsFHsQTNogvTJQBWz1hPt2iPoQvX82MQ8U=", 
        title: "Cast Your Vote in the Battle for the Best Peanut Butter",
        description: "Vote for the peanut butter brand that you love the most! Help the community choose the ultimate peanut...",
        label: "Vote",
        links: {
            actions: [
                {
                type: "transaction",
                label: "Vote for Crunchy",
                href: "/api/vote?candidate=Crunchy",
                },
                {
                type: "transaction",
                label: "Vote for Smooth",
                href: "/api/vote?candidate=Smooth",
                }
            ]
        }
    };
    return new Response(JSON.stringify(actionMetadata), {
        headers: ACTIONS_CORS_HEADERS
    });
}

export async function POST(request: Request) {
    const url = new URL(request.url);
    const candidate = url.searchParams.get("candidate");

    if (candidate != "Crunchy" && candidate != "Smooth"){
        return new Response("Invalid Candidate!", { status: 400, headers: ACTIONS_CORS_HEADERS});
    }

    const connection = new Connection("https://api.devnet.solana.com", "confirmed")
    const program: Program<Voting> = new Program(IDL, {connection});

    const body: ActionPostRequest = await request.json();
    let voter = new PublicKey(body.account);

    try {
        voter = new PublicKey(body.account);
    } catch(error) {
        return new Response("Invalid Account!", { status: 400, headers: ACTIONS_CORS_HEADERS });
    }

    const instruction = await program.methods
    .vote(
        candidate, new BN(1)
    )
    .accounts({
        signer: voter,
    })
    .instruction();

    const blockhash = await connection.getLatestBlockhash();

    const transaction = new Transaction({
        feePayer: voter,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
    }).add(instruction);

    const response = await createPostResponse({
        fields: {
            type: "transaction",
            transaction: transaction,
        }
    });

    return Response.json(response, {headers: ACTIONS_CORS_HEADERS});

}