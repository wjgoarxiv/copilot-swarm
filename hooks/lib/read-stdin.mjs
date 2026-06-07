// Shared stdin reader for hooks. Resolves once on 'end'/'error' or after a short
// timeout, so a hook never hangs when nothing is piped.
export function readStdin(timeoutMs = 250) {
  return new Promise((resolve) => {
    let buf = "";
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(buf); } };
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => (buf += d));
    process.stdin.on("end", finish);
    process.stdin.on("error", finish);
    setTimeout(finish, timeoutMs);
  });
}
