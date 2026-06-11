import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "../..");
const travelGuideDir = path.join(pluginRoot, "skills/ultracode/workflows/travel-guide");
const workflowsRoot = path.join(pluginRoot, "skills/ultracode/workflows");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("packaged travel-guide workflow has the expected public structure", () => {
  const workflow = readJson(path.join(travelGuideDir, "workflow.json"));
  const paramTemplate = readJson(path.join(travelGuideDir, "param.template.json"));

  assert.equal(workflow.name, "travel-guide");
  assert.match(workflow.description, /travel guide/i);
  assert.deepEqual(
    workflow.stages.map((stage) => [stage.name, stage.output.file]),
    [
      ["plan-brief", "planning-brief.md"],
      ["draft-itinerary", "travel-guide.md"],
      ["review-itinerary", "travel-guide-review.md"],
    ],
  );
  assert.ok(workflow.keywords.includes("旅游"));
  assert.ok(workflow.keywords.includes("攻略"));
  assert.ok(workflow.keywords.includes("kyoto"));

  assert.equal(paramTemplate.mode, "read-only");
  assert.equal(paramTemplate.trip.durationDays, 3);
  assert.ok(paramTemplate.trip.constraints.includes("avoid claiming live opening hours or ticket prices"));
});

test("packaged travel-guide README gives a friendly Chinese trigger prompt", () => {
  const readme = fs.readFileSync(path.join(travelGuideDir, "README.md"), "utf8");

  assert.match(readme, /\$ultracode 帮我为第一次去京都的两位成人做 3 天旅游攻略/);
  assert.doesNotMatch(readme, /3 天游攻略/);
  assert.match(readme, /节奏轻松一点/);
  assert.match(readme, /包含雨天方案/);
});

test("packaged built-in workflows cover research, review, and debug/fix", () => {
  const expected = [
    {
      name: "deep-research",
      mode: "read-only",
      keywords: ["deep research", "research", "调研", "深度研究"],
      outputs: [
        "research-brief.md",
        "source-map.md",
        "deep-research-report.md",
        "research-review.md",
      ],
      promptSnippet: /\$ultracode deep-research "调研 AI 编程助手在大型代码库中的协作模式"/,
    },
    {
      name: "code-review",
      mode: "read-only",
      keywords: ["code review", "review", "代码审查", "评审"],
      outputs: ["review-scope.md", "code-review-findings.md", "code-review-risk-check.md"],
      promptSnippet: /\$ultracode code-review "审查当前分支相对 main 的变更"/,
    },
    {
      name: "debug-fix",
      mode: "write",
      keywords: ["debug", "fix", "bug", "修复", "排障"],
      outputs: [
        "failure-reproduction.md",
        "root-cause-analysis.md",
        "fix-summary.md",
        "verification-report.md",
      ],
      promptSnippet: /\$ultracode debug-fix "修复 npm test 里的失败用例"/,
    },
  ];

  for (const item of expected) {
    const workflowDir = path.join(workflowsRoot, item.name);
    const workflow = readJson(path.join(workflowDir, "workflow.json"));
    const paramTemplate = readJson(path.join(workflowDir, "param.template.json"));
    const readme = fs.readFileSync(path.join(workflowDir, "README.md"), "utf8");

    assert.equal(workflow.name, item.name);
    for (const keyword of item.keywords) {
      assert.ok(workflow.keywords.includes(keyword), `${item.name} should include ${keyword}`);
    }
    assert.deepEqual(
      workflow.stages.map((stage) => stage.output.file),
      item.outputs,
    );
    const writeStages = workflow.stages.filter((stage) => stage.agent?.mode === "write");
    if (item.mode === "read-only") {
      assert.deepEqual(writeStages, []);
      assert.equal(paramTemplate.mode, "read-only");
    } else {
      assert.equal(writeStages.length, 1);
      assert.equal(paramTemplate.mode, "write");
    }
    assert.match(readme, item.promptSnippet);
  }
});
