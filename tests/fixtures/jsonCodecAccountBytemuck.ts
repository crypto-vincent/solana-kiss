import {
  jsonCodecArray,
  jsonCodecArrayToTuple,
  jsonCodecBoolean,
  jsonCodecBytesArray,
  jsonCodecConst,
  jsonCodecInteger,
  jsonCodecNumber,
  jsonCodecObject,
  jsonCodecObjectToEnum,
  jsonCodecOptional,
  jsonCodecPubkey,
} from "../../src";

export const jsonCodecAccountBytemuck = jsonCodecObject({
  state: jsonCodecObject({
    metadata: jsonCodecObject({
      name: jsonCodecArrayToTuple(jsonCodecBytesArray),
      description: jsonCodecArrayToTuple(jsonCodecBytesArray),
      numParameters: jsonCodecInteger,
      vocabSize: jsonCodecInteger,
    }),
    coordinator: jsonCodecObject({
      runId: jsonCodecArrayToTuple(jsonCodecBytesArray),
      runState: jsonCodecConst(
        "Uninitialized",
        "WaitingForMembers",
        "Warmup",
        "RoundTrain",
        "RoundWitness",
        "Cooldown",
        "Finished",
        "Paused",
      ),
      model: jsonCodecObjectToEnum({
        LLM: jsonCodecArrayToTuple(
          jsonCodecObject({
            maxSeqLen: jsonCodecNumber,
            coldStartWarmupSteps: jsonCodecNumber,
            architecture: jsonCodecConst("HfLlama", "HfDeepseek", "HfAuto"),
            checkpoint: jsonCodecObjectToEnum({
              Ephemeral: jsonCodecConst(null),
              Dummy: jsonCodecArrayToTuple(
                jsonCodecObject({
                  repoId: jsonCodecArrayToTuple(jsonCodecBytesArray),
                  revision: jsonCodecOptional(
                    jsonCodecArrayToTuple(jsonCodecBytesArray),
                  ),
                }),
              ),
              Hub: jsonCodecArrayToTuple(
                jsonCodecObject({
                  repoId: jsonCodecArrayToTuple(jsonCodecBytesArray),
                  revision: jsonCodecOptional(
                    jsonCodecArrayToTuple(jsonCodecBytesArray),
                  ),
                }),
              ),
              P2P: jsonCodecArrayToTuple(
                jsonCodecObject({
                  repoId: jsonCodecArrayToTuple(jsonCodecBytesArray),
                  revision: jsonCodecOptional(
                    jsonCodecArrayToTuple(jsonCodecBytesArray),
                  ),
                }),
              ),
            }),
            dataType: jsonCodecConst("Pretraining", "Finetuning"),
            dataLocation: jsonCodecObjectToEnum({
              Dummy: jsonCodecConst(null),
              Server: jsonCodecArrayToTuple(
                jsonCodecArrayToTuple(jsonCodecBytesArray),
              ),
              Local: jsonCodecArrayToTuple(
                jsonCodecArrayToTuple(jsonCodecBytesArray),
              ),
              Http: jsonCodecArrayToTuple(
                jsonCodecObject({
                  location: jsonCodecObjectToEnum({
                    SingleUrl: jsonCodecArrayToTuple(
                      jsonCodecArrayToTuple(jsonCodecBytesArray),
                    ),
                    NumberedFiles: jsonCodecObject({
                      urlTemplate: jsonCodecArrayToTuple(jsonCodecBytesArray),
                      startIndex: jsonCodecNumber,
                      nLeftPadZeros: jsonCodecNumber,
                      numFiles: jsonCodecNumber,
                    }),
                    Gcp: jsonCodecObject({
                      bucketName: jsonCodecArrayToTuple(jsonCodecBytesArray),
                      filterDirectory:
                        jsonCodecArrayToTuple(jsonCodecBytesArray),
                    }),
                  }),
                  tokenSizeInBytes: jsonCodecConst("TwoBytes", "FourBytes"),
                  shuffle: jsonCodecObjectToEnum({
                    DontShuffle: jsonCodecConst(null),
                    Seeded: jsonCodecArrayToTuple(jsonCodecBytesArray),
                  }),
                }),
              ),
              WeightedHttp: jsonCodecArrayToTuple(
                jsonCodecArrayToTuple(jsonCodecBytesArray),
              ),
              Preprocessed: jsonCodecArrayToTuple(
                jsonCodecArrayToTuple(jsonCodecBytesArray),
              ),
            }),
            lrSchedule: jsonCodecObjectToEnum({
              Constant: jsonCodecArrayToTuple(
                jsonCodecObject({
                  baseLr: jsonCodecNumber,
                  warmupInitLr: jsonCodecNumber,
                  warmupSteps: jsonCodecNumber,
                }),
              ),
              Linear: jsonCodecArrayToTuple(
                jsonCodecObject({
                  baseLr: jsonCodecNumber,
                  warmupInitLr: jsonCodecNumber,
                  finalLr: jsonCodecNumber,
                  warmupSteps: jsonCodecNumber,
                  totalSteps: jsonCodecNumber,
                }),
              ),
              Cosine: jsonCodecArrayToTuple(
                jsonCodecObject({
                  baseLr: jsonCodecNumber,
                  warmupInitLr: jsonCodecNumber,
                  finalLr: jsonCodecNumber,
                  warmupSteps: jsonCodecNumber,
                  totalSteps: jsonCodecNumber,
                }),
              ),
              WarmupStableDecay: jsonCodecArrayToTuple(
                jsonCodecObject({
                  baseLr: jsonCodecNumber,
                  warmupInitLr: jsonCodecNumber,
                  cosineDecayFinalLr: jsonCodecNumber,
                  linearDecayFinalLr: jsonCodecNumber,
                  warmupSteps: jsonCodecNumber,
                  stableSteps: jsonCodecNumber,
                  cosineDecaySteps: jsonCodecNumber,
                  linearDecaySteps: jsonCodecNumber,
                }),
              ),
            }),
            optimizer: jsonCodecObjectToEnum({
              Dummy: jsonCodecConst(null),
              AdamW: jsonCodecObject({
                betas: jsonCodecArray(jsonCodecNumber),
                weightDecay: jsonCodecNumber,
                eps: jsonCodecNumber,
                clipGradNorm: jsonCodecOptional(jsonCodecNumber),
              }),
              Distro: jsonCodecObject({
                clipGradNorm: jsonCodecOptional(jsonCodecNumber),
                weightDecay: jsonCodecOptional(jsonCodecNumber),
                compressionDecay: jsonCodecNumber,
                compressionTopk: jsonCodecNumber,
                compressionChunk: jsonCodecNumber,
                quantize_1bit: jsonCodecBoolean,
              }),
            }),
          }),
        ),
      }),
      config: jsonCodecObject({
        warmupTime: jsonCodecInteger,
        cooldownTime: jsonCodecInteger,
        maxRoundTrainTime: jsonCodecInteger,
        roundWitnessTime: jsonCodecInteger,
        globalBatchSizeWarmupTokens: jsonCodecInteger,
        roundsPerEpoch: jsonCodecNumber,
        totalSteps: jsonCodecNumber,
        initMinClients: jsonCodecNumber,
        minClients: jsonCodecNumber,
        witnessNodes: jsonCodecNumber,
        globalBatchSizeStart: jsonCodecNumber,
        globalBatchSizeEnd: jsonCodecNumber,
        verificationPercent: jsonCodecNumber,
      }),
      progress: jsonCodecObject({
        epoch: jsonCodecNumber,
        step: jsonCodecNumber,
        epochStartDataIndex: jsonCodecInteger,
      }),
      epochState: jsonCodecObject({
        rounds: jsonCodecArray(
          jsonCodecObject({
            witnesses: jsonCodecObject({
              data: jsonCodecArray(
                jsonCodecObject({
                  proof: jsonCodecObject({
                    position: jsonCodecInteger,
                    index: jsonCodecInteger,
                    witness: jsonCodecArrayToTuple(jsonCodecNumber),
                  }),
                  participantBloom: jsonCodecObject({
                    keys: jsonCodecArray(jsonCodecInteger),
                    bits: jsonCodecObject({
                      0: jsonCodecArray(jsonCodecInteger),
                    }),
                  }),
                  broadcastBloom: jsonCodecObject({
                    keys: jsonCodecArray(jsonCodecInteger),
                    bits: jsonCodecObject({
                      0: jsonCodecArray(jsonCodecInteger),
                    }),
                  }),
                  broadcastMerkle: jsonCodecObject({
                    inner: jsonCodecBytesArray,
                  }),
                }),
              ),
              len: jsonCodecInteger,
            }),
            dataIndex: jsonCodecInteger,
            randomSeed: jsonCodecInteger,
            height: jsonCodecNumber,
            clientsLen: jsonCodecNumber,
            tieBreakerTasks: jsonCodecNumber,
          }),
        ),
        clients: jsonCodecObject({
          data: jsonCodecArray(
            jsonCodecObject({
              id: jsonCodecObject({
                signer: jsonCodecPubkey,
                p2pIdentity: jsonCodecBytesArray,
              }),
              state: jsonCodecConst(
                "Healthy",
                "Dropped",
                "Withdrawn",
                "Ejected",
              ),
              exitedHeight: jsonCodecNumber,
            }),
          ),
          len: jsonCodecInteger,
        }),
        exitedClients: jsonCodecObject({
          data: jsonCodecArray(
            jsonCodecObject({
              id: jsonCodecObject({
                signer: jsonCodecPubkey,
                p2pIdentity: jsonCodecBytesArray,
              }),
              state: jsonCodecConst(
                "Healthy",
                "Dropped",
                "Withdrawn",
                "Ejected",
              ),
              exitedHeight: jsonCodecNumber,
            }),
          ),
          len: jsonCodecInteger,
        }),
        roundsHead: jsonCodecNumber,
        startStep: jsonCodecNumber,
        firstRound: jsonCodecArrayToTuple(jsonCodecNumber),
        checkpointed: jsonCodecArrayToTuple(jsonCodecNumber),
        coldStartEpoch: jsonCodecArrayToTuple(jsonCodecNumber),
      }),
      runStateStartUnixTimestamp: jsonCodecInteger,
      pendingPause: jsonCodecArrayToTuple(jsonCodecNumber),
    }),
    clientsState: jsonCodecObject({
      clients: jsonCodecObject({
        data: jsonCodecArray(
          jsonCodecObject({
            id: jsonCodecObject({
              signer: jsonCodecPubkey,
              p2pIdentity: jsonCodecBytesArray,
            }),
            unused: jsonCodecBytesArray,
            earned: jsonCodecInteger,
            slashed: jsonCodecInteger,
            active: jsonCodecInteger,
          }),
        ),
        len: jsonCodecInteger,
      }),
      nextActive: jsonCodecInteger,
      currentEpochRates: jsonCodecObject({
        earningRate: jsonCodecInteger,
        slashingRate: jsonCodecInteger,
      }),
      futureEpochRates: jsonCodecObject({
        earningRate: jsonCodecInteger,
        slashingRate: jsonCodecInteger,
      }),
    }),
    isWarmupFirstTick: jsonCodecArrayToTuple(jsonCodecNumber),
    isTrainingFirstTick: jsonCodecArrayToTuple(jsonCodecNumber),
  }),
  nonce: jsonCodecInteger,
});
