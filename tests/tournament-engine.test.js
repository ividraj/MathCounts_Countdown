const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createEngineState,
  getActiveCount,
  getCurrentTarget,
  isFinalFourMode,
  hasMatchWinner,
  addPoint,
} = require("../tournament-engine.js");

function buildTenCompetitors() {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

function buildSixteenCompetitors() {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
}

test("initial engine state is valid", () => {
  const engine = createEngineState(buildTenCompetitors());
  assert.equal(engine.phase, "inMatch");
  assert.equal(engine.leftId, 1);
  assert.equal(engine.rightId, 2);
  assert.deepEqual(engine.unrankedQueue, [3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(engine.backRank, 10);
  assert.equal(getCurrentTarget(engine), 3);
});

test("supports 16 competitors setup", () => {
  const engine = createEngineState(buildSixteenCompetitors());
  assert.equal(engine.leftId, 1);
  assert.equal(engine.rightId, 2);
  assert.equal(engine.unrankedQueue.length, 14);
  assert.equal(engine.backRank, 16);
});

test("left winner stays in left seat and loser gets placed at back", () => {
  let engine = createEngineState(buildTenCompetitors());

  engine = addPoint(engine, "left").state;
  engine = addPoint(engine, "left").state;
  const result = addPoint(engine, "left");

  assert.equal(result.event.type, "matchWon");
  assert.equal(result.event.winnerSide, "left");
  assert.equal(result.state.leftId, 1);
  assert.equal(result.state.rightId, 3);
  assert.equal(result.state.placements[10], 2);
  assert.deepEqual(result.state.scores, { left: 0, right: 0 });
  assert.deepEqual(result.state.unrankedQueue, [4, 5, 6, 7, 8, 9, 10]);
});

test("right winner stays in right seat and loser gets placed at back", () => {
  let engine = createEngineState(buildTenCompetitors());

  engine = addPoint(engine, "right").state;
  engine = addPoint(engine, "right").state;
  const result = addPoint(engine, "right");

  assert.equal(result.event.type, "matchWon");
  assert.equal(result.event.winnerSide, "right");
  assert.equal(result.state.rightId, 2);
  assert.equal(result.state.leftId, 3);
  assert.equal(result.state.placements[10], 1);
  assert.deepEqual(result.state.unrankedQueue, [4, 5, 6, 7, 8, 9, 10]);
});

test("last four switches to lead-by-margin rule", () => {
  const ids = [1, 2, 3, 4, 5, 6, 7];
  let engine = createEngineState(ids, { regularTarget: 3, finalFourMargin: 3 });

  for (let i = 0; i < 3; i += 1) {
    engine = addPoint(engine, "left").state;
    engine = addPoint(engine, "left").state;
    engine = addPoint(engine, "left").state;
  }

  assert.equal(getActiveCount(engine), 4);
  assert.equal(isFinalFourMode(engine), true);
  assert.equal(getCurrentTarget(engine), null);

  engine = addPoint(engine, "left").state;
  engine = addPoint(engine, "left").state;
  engine = addPoint(engine, "right").state;
  engine = addPoint(engine, "left").state;

  assert.equal(engine.scores.left, 3);
  assert.equal(engine.scores.right, 1);
  assert.equal(hasMatchWinner(engine, "left"), false);

  const result = addPoint(engine, "left");
  assert.equal(result.event.type, "matchWon");
  assert.equal(result.event.winnerSide, "left");
});

test("final match places champion at rank 1 and marks finished", () => {
  const ids = [1, 2];
  let engine = createEngineState(ids, { finalFourMargin: 3 });

  engine = addPoint(engine, "right").state;
  engine = addPoint(engine, "right").state;
  engine = addPoint(engine, "left").state;
  engine = addPoint(engine, "right").state;
  const result = addPoint(engine, "right");

  assert.equal(result.event.type, "matchWon");
  assert.equal(result.event.tournamentFinished, true);
  assert.equal(result.state.phase, "finished");
  assert.equal(result.state.placements[2], 1);
  assert.equal(result.state.placements[1], 2);
});

test("invalid side throws", () => {
  const engine = createEngineState(buildTenCompetitors());
  assert.throws(() => addPoint(engine, "middle"), /Side must be/);
});

test("addPoint is ignored when tournament is already finished", () => {
  let engine = createEngineState([1, 2]);
  engine = addPoint(engine, "left").state;
  engine = addPoint(engine, "left").state;
  engine = addPoint(engine, "right").state;
  engine = addPoint(engine, "left").state;
  engine = addPoint(engine, "left").state;
  engine = addPoint(engine, "left").state;

  const ignored = addPoint(engine, "left");
  assert.equal(ignored.event.type, "ignored");
  assert.equal(ignored.event.reason, "not-in-match");
});
