import { Accessor, createEffect, createResource } from "solid-js";
import { promiseWithResolvers } from "../utils/misc";

export function useResourceWithPromise<TSource, TData>(
  source: Accessor<TSource>,
  loader: (source: TSource) => Promise<TData>,
): [() => TData | undefined, { promise: Promise<void>; reset: () => void }] {
  const [resource] = createResource(source, loader);
  const { promise, reset, resolve, reject } = promiseWithResolvers();
  let settled = false;

  createEffect(() => {
    const state = resource.state;
    if (state === "ready") {
      resolve();
      settled = true;
    } else if (state === "errored") {
      reject(new Error("failed to fetch resource"));
      settled = true;
    } else if (settled) {
      // only swap the promise once it settled - callers awaiting the pending
      // one would otherwise never be resolved
      reset();
      settled = false;
    }
  });

  return [resource, { promise, reset }];
}
