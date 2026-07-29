import { type RefObject, useEffect, useRef } from "react";

/** 在 `active` 为 true 时，点在任一 ref 节点之外则触发 `onDismiss`（用于浮层 / 弹出菜单） */
export function useDismissOnOutsidePress(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void
) {
  useDismissOnOutsidePressAny(active, [containerRef], onDismiss);
}

export function useDismissOnOutsidePressAny(
  active: boolean,
  containerRefs: Array<RefObject<HTMLElement | null>>,
  onDismiss: () => void
) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const refsRef = useRef(containerRefs);
  refsRef.current = containerRefs;

  useEffect(() => {
    if (!active) return;
    /** 冒泡阶段：与触发按钮的 onClick 同一阶段，先执行子节点再冒泡到 document，避免捕获阶段抢跑导致开关异常 */
    const onClick = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      const inside = refsRef.current.some((r) => r.current?.contains(t));
      if (!inside) onDismissRef.current();
    };
    document.addEventListener("click", onClick, false);
    return () => {
      document.removeEventListener("click", onClick, false);
    };
  }, [active]);
}
