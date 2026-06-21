import { evalEngineRuleConfigCache } from "./cache";
import { queryEvalRule } from "../data/queries/eval/rule";

export async function getCachedEvalEngineRuleConfig(group: string, userName: string) {
    const key = `eval_engine_rule:${group}`;

    return evalEngineRuleConfigCache.get(
        key,
        async () => {
            try {
                const evalRules = await queryEvalRule({group: group}, {userName: userName})
                return evalRules;
            } catch (error) {
                throw Error('EvalEngine Rule Cache. DB Error ' + error);
            }
        },
        300_000
    )
}