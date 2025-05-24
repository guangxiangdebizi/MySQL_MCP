import * as schemas from "./schemas.js";
import { $ZodTuple } from "./schemas.js";
import type * as util from "./util.js";
export interface $ZodFunctionDef<In extends $ZodFunctionIn = $ZodFunctionIn, Out extends $ZodFunctionOut = $ZodFunctionOut> {
    type: "function";
    input: In;
    output: Out;
}
export type $ZodFunctionArgs = schemas.$ZodType<unknown[], unknown[]>;
export type $ZodFunctionIn = $ZodFunctionArgs | null;
export type $ZodFunctionOut = schemas.$ZodType | null;
export type $InferInnerFunctionType<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: null extends Args ? never[] : NonNullable<Args>["_zod"]["output"]) => null extends Returns ? unknown : NonNullable<Returns>["_zod"]["input"];
export type $InferInnerFunctionTypeAsync<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: null extends Args ? never[] : NonNullable<Args>["_zod"]["output"]) => null extends Returns ? unknown : util.MaybeAsync<NonNullable<Returns>["_zod"]["input"]>;
export type $InferOuterFunctionType<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: null extends Args ? never[] : NonNullable<Args>["_zod"]["input"]) => null extends Returns ? unknown : NonNullable<Returns>["_zod"]["output"];
export type $InferOuterFunctionTypeAsync<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: null extends Args ? never[] : NonNullable<Args>["_zod"]["input"]) => null extends Returns ? unknown : util.MaybeAsync<NonNullable<Returns>["_zod"]["output"]>;
export declare class $ZodFunction<Args extends $ZodFunctionIn = $ZodFunctionIn, Returns extends $ZodFunctionOut = $ZodFunctionOut> {
    def: $ZodFunctionDef<Args, Returns>;
    /** @deprecated */
    _def: $ZodFunctionDef<Args, Returns>;
    _input: $InferInnerFunctionType<Args, Returns>;
    _output: $InferOuterFunctionType<Args, Returns>;
    constructor(def: $ZodFunctionDef<Args, Returns>);
    implement<F extends $InferInnerFunctionType<Args, Returns>>(func: F): F extends this["_output"] ? F : this["_output"];
    implementAsync<F extends $InferInnerFunctionTypeAsync<Args, Returns>>(func: F): F extends $InferOuterFunctionTypeAsync<Args, Returns> ? F : $InferOuterFunctionTypeAsync<Args, Returns>;
    input<const Items extends util.TupleItems, const Rest extends $ZodFunctionOut = null>(args: Items, rest?: Rest): $ZodFunction<schemas.$ZodTuple<Items, Rest>, Returns>;
    input<NewArgs extends $ZodFunctionIn>(args: NewArgs): $ZodFunction<NewArgs, Returns>;
    output<NewReturns extends schemas.$ZodType>(output: NewReturns): $ZodFunction<Args, NewReturns>;
}
export interface $ZodFunctionParams<I extends $ZodFunctionIn, O extends schemas.$ZodType> {
    input?: I;
    output?: O;
}
declare function _function(): $ZodFunction;
declare function _function<const In extends Array<schemas.$ZodType> = Array<schemas.$ZodType>>(params: {
    input: In;
}): $ZodFunction<$ZodTuple<In, null>, null>;
declare function _function<const In extends $ZodFunctionIn = $ZodFunctionIn>(params: {
    input: In;
}): $ZodFunction<In, null>;
declare function _function<const Out extends $ZodFunctionOut = $ZodFunctionOut>(params: {
    output: Out;
}): $ZodFunction<null, Out>;
declare function _function<In extends $ZodFunctionIn = $ZodFunctionIn, Out extends schemas.$ZodType = schemas.$ZodType>(params?: {
    input: In;
    output: Out;
}): $ZodFunction<In, Out>;
export { _function as function };
