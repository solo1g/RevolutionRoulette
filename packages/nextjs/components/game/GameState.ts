import { Address } from "viem";

type RngCommit = {
  randNum: bigint;
  itemsToUse: number;
  target: number;
  block: bigint;
};

type Player = {
  health: number;
  items: number[];
  effects: number;
};

enum GameStage {
  InitCommit,
  InitReveal,
  MyTurn,
  OpponentTurn,
  End,
}

class GameState {
  readonly turn: number;
  readonly liveRounds: number;
  readonly blankRounds: number;
  readonly rngCommit: RngCommit;
  readonly status: number;
  private readonly player1: Player;
  private readonly player2: Player;
  readonly myAddress: Address;
  readonly opponentAddress: Address;
  readonly betAmount: bigint;

  private _stage: GameStage = GameStage.InitCommit;
  get stage(): GameStage {
    return this._stage;
  }

  constructor(
    turn: number,
    liveRounds: number,
    blankRounds: number,
    status: number,
    betAmount: bigint,
    rngCommit: RngCommit,
    player1: Player,
    player2: Player,
    myAddress: Address,
    opponentAddress: Address,
  ) {
    this.turn = turn;
    this.liveRounds = liveRounds;
    this.blankRounds = blankRounds;
    this.rngCommit = rngCommit;
    this.player1 = player1;
    this.player2 = player2;
    this.status = status;
    this.betAmount = betAmount;

    this.myAddress = myAddress;
    this.opponentAddress = opponentAddress;

    if (this.status == 0 || this.status == 4) {
      this._stage = GameStage.InitCommit;
    } else if (this.status == 1) {
      this._stage = GameStage.InitReveal;
    } else if (this.status == 3) {
      this._stage = GameStage.End;
    } else if (this.isMyTurn) {
      this._stage = GameStage.MyTurn;
    } else {
      this._stage = GameStage.OpponentTurn;
    }

    console.log("New Game State");
    console.log(this.toString());
  }

  playerData() {
    if (BigInt(this.myAddress) < BigInt(this.opponentAddress)) {
      return [this.player1, this.player2];
    } else {
      return [this.player2, this.player1];
    }
  }

  get myPlayerData(): Player {
    return this.playerData()[0];
  }

  get opponentPlayerData(): Player {
    return this.playerData()[1];
  }

  toString() {
    return `
      Turn: ${this.turn}
      Live Rounds: ${this.liveRounds}
      Blank Rounds: ${this.blankRounds}
      Is My Turn: ${this.isMyTurn}
      Stage: ${GameStage[this._stage]}
      Status: ${this.status}
      `;
  }

  get isMyTurn(): boolean {
    // if im the smaller address and its the smaller address turn (even parity)
    return BigInt(this.myAddress) < BigInt(this.opponentAddress) == (this.turn % 2 == 0);
  }

  get isCommited(): boolean {
    return this.rngCommit.block != BigInt(0);
  }

  get amIWinner(): boolean {
    if (this.stage != GameStage.End) {
      console.warn("Winner is not determined yet");
      return false;
    }
    return this.myPlayerData.health > this.opponentPlayerData.health;
  }
}

export { GameState, GameStage };
