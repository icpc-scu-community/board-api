export function parseVerdict(verdict: string){
    const v = verdict.trim().toLowerCase();
    if (v === "accepted") return "AC";
    else if (v.includes("wrong answer")) return "WA";
    else if (v.includes("time limit")) return "TLE";
    else if (v.includes("memory limit")) return "MLE";
    else if (v.includes("runtime error")) return "RTE";
    else if (v.includes("compilation")) return "CE";
    else return "OTHERS";
  }
