import { useEffect, useRef } from "react";
import { useClientStore } from "../store/clientStore";

export function useClientDetection() {
  const detectAll = useClientStore((s) => s.detectAll);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    detectAll();
  }, [detectAll]);
}
