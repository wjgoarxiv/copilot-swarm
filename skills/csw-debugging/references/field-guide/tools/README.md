# Tool selection routes

Use a tool only after a named hypothesis requires the observation it provides.

| Observation needed | Leaf | Gate |
| --- | --- | --- |
| Browser console, network, DOM, screenshot, or trace | [Browser observation](browser-observation.md) | reuse existing project setup |
| Static analysis of an authorized native binary | [Ghidra](ghidra.md) | existing installation and approved artifact |
| GDB state with enhanced context views | [Enhanced GDB workflow](pwndbg.md) | suitable platform and authorized process |

Tool absence is not permission to install. Use a lower-invasiveness repository-native probe or
report the blocked evidence. Every launched process and generated artifact needs a recorded owner,
bounded lifetime, and exact cleanup path.
