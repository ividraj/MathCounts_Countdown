(function (globalScope) {
  function assertValidCompetitors(competitorIds) {
    if (!Array.isArray(competitorIds) || competitorIds.length < 2) {
      throw new Error("At least two competitors are required.");
    }

    const unique = new Set(competitorIds);
    if (unique.size !== competitorIds.length) {
      throw new Error("Competitor ids must be unique.");
    }
  }

  function cloneEngineState(engineState) {
    return {
      phase: engineState.phase,
      competitorIds: [...engineState.competitorIds],
      leftId: engineState.leftId,
      rightId: engineState.rightId,
      unrankedQueue: [...engineState.unrankedQueue],
      placements: { ...engineState.placements },
      backRank: engineState.backRank,
      scores: { ...engineState.scores },
      regularTarget: engineState.regularTarget,
      finalFourMargin: engineState.finalFourMargin,
      winCounts: { ...engineState.winCounts },
    };
  }

  function createEngineState(competitorIds, options = {}) {
    assertValidCompetitors(competitorIds);

    const regularTarget = options.regularTarget ?? 3;
    const finalFourMargin = options.finalFourMargin ?? 3;

    if (regularTarget < 1 || finalFourMargin < 1) {
      throw new Error("Win rule values must be at least 1.");
    }

    return {
      phase: "inMatch",
      competitorIds: [...competitorIds],
      leftId: competitorIds[0],
      rightId: competitorIds[1],
      unrankedQueue: competitorIds.slice(2),
      placements: {},
      backRank: competitorIds.length,
      scores: { left: 0, right: 0 },
      regularTarget,
      finalFourMargin,
      winCounts: {},
    };
  }

  function getActiveCount(engineState) {
    return engineState.competitorIds.length - Object.keys(engineState.placements).length;
  }

  function isFinalFourMode(engineState) {
    return getActiveCount(engineState) <= 4;
  }

  function getCurrentTarget(engineState) {
    return isFinalFourMode(engineState) ? null : engineState.regularTarget;
  }

  function hasMatchWinner(engineState, side) {
    if (side !== "left" && side !== "right") {
      throw new Error('Side must be "left" or "right".');
    }

    if (isFinalFourMode(engineState)) {
      const scoreDiff = engineState.scores.left - engineState.scores.right;
      return side === "left" ? scoreDiff >= engineState.finalFourMargin : -scoreDiff >= engineState.finalFourMargin;
    }

    return engineState.scores[side] >= engineState.regularTarget;
  }

  function addPoint(engineState, side) {
    if (side !== "left" && side !== "right") {
      throw new Error('Side must be "left" or "right".');
    }

    if (engineState.phase !== "inMatch") {
      return {
        state: cloneEngineState(engineState),
        event: { type: "ignored", reason: "not-in-match" },
      };
    }

    const nextState = cloneEngineState(engineState);
    nextState.scores[side] += 1;

    if (!hasMatchWinner(nextState, side)) {
      return {
        state: nextState,
        event: { type: "point", side },
      };
    }

    const winnerSide = side;
    const winnerId = winnerSide === "left" ? nextState.leftId : nextState.rightId;
    const loserId = winnerSide === "left" ? nextState.rightId : nextState.leftId;

    nextState.placements[nextState.backRank] = loserId;
    nextState.backRank -= 1;
    nextState.winCounts[winnerId] = (nextState.winCounts[winnerId] ?? 0) + 1;

    if (nextState.unrankedQueue.length === 0) {
      nextState.placements[1] = winnerId;
      nextState.phase = "finished";
      nextState.scores = { left: 0, right: 0 };

      return {
        state: nextState,
        event: {
          type: "matchWon",
          winnerId,
          loserId,
          winnerSide,
          tournamentFinished: true,
        },
      };
    }

    const incomingId = nextState.unrankedQueue.shift();
    if (winnerSide === "left") {
      nextState.leftId = winnerId;
      nextState.rightId = incomingId;
    } else {
      nextState.rightId = winnerId;
      nextState.leftId = incomingId;
    }

    nextState.scores = { left: 0, right: 0 };

    return {
      state: nextState,
      event: {
        type: "matchWon",
        winnerId,
        loserId,
        winnerSide,
        nextCompetitorId: incomingId,
        tournamentFinished: false,
      },
    };
  }

  const api = {
    createEngineState,
    cloneEngineState,
    getActiveCount,
    isFinalFourMode,
    getCurrentTarget,
    hasMatchWinner,
    addPoint,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.TournamentEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
