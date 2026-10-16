# NetCore Academy curriculum and question bank

## Curriculum scope

The seed contains two ordered tracks: Computer Networking and Operating Systems/Linux. Lessons are static structured content in `artifacts/netcore-academy/src/data/lessons.json`; topic records and question records are imported into PostgreSQL from `artifacts/api-server/src/data/seed-questions.json`.

### Computer Networking

1. **Network Fundamentals** (`net-network-basics`) — 20 questions
2. **Models & Layers** (`net-osi`) — 22 questions
3. **Network Devices & Roles** (`net-devices`) — 20 questions
4. **Ethernet, MAC & ARP** (`net-ethernet`) — 22 questions
5. **Network Media & Physical Layer** (`net-media`) — 22 questions
6. **IPv4 Addressing** (`net-ip`) — 22 questions
7. **Subnetting & Address Planning** (`net-subnetting`) — 20 questions
8. **IPv6 Addressing** (`net-ipv6`) — 20 questions
9. **Switching & Routing** (`net-routing`) — 22 questions
10. **VLANs & Trunking** (`net-vlans`) — 20 questions
11. **Dynamic Routing & OSPF Basics** (`net-ospf`) — 20 questions
12. **Transport & Ports** (`net-transport`) — 22 questions
13. **Network Services: DHCP & DNS** (`net-services`) — 22 questions
14. **NAT, PAT & Private Networks** (`net-nat`) — 20 questions
15. **Wireless Networking** (`net-wireless`) — 20 questions
16. **Troubleshooting & Network Security Basics** (`net-troubleshooting`) — 22 questions
17. **ACLs & Network Access Control** (`net-security-acl`) — 20 questions
18. **Network Diagnostic Tools** (`net-tools`) — 20 questions
19. **Packet Analysis with Wireshark** (`net-wireshark`) — 20 questions
20. **Nmap & Service Discovery** (`net-nmap`) — 20 questions
21. **Network Monitoring & Performance** (`net-monitoring`) — 20 questions
22. **Integrated Network Labs** (`net-labs`) — 20 questions

### Operating Systems & Linux

1. **Operating System Fundamentals** (`os-fundamentals`) — 22 questions
2. **Processes & Threads** (`os-processes`) — 22 questions
3. **CPU Scheduling** (`os-scheduling`) — 22 questions
4. **Concurrency, Synchronization & Deadlocks** (`os-concurrency`) — 22 questions
5. **Memory Management & Virtual Memory** (`os-memory`) — 22 questions
6. **File Systems & Permissions** (`os-files`) — 22 questions
7. **I/O, Interrupts & Device Drivers** (`os-io`) — 22 questions
8. **Boot Process & Linux Overview** (`os-boot-linux`) — 22 questions
9. **Linux Shell & Command-Line Basics** (`os-shell`) — 20 questions
10. **Linux Filesystem Navigation** (`os-linux-filesystem`) — 20 questions
11. **Linux Users, Groups & Permissions** (`os-linux-permissions`) — 20 questions
12. **Text Processing & CLI Workflows** (`os-cli-text`) — 20 questions
13. **Linux Process & Resource Tools** (`os-process-tools`) — 20 questions
14. **Linux Services & systemd** (`os-services`) — 20 questions
15. **Linux Networking Fundamentals** (`os-linux-networking`) — 20 questions
16. **Linux Storage & Filesystems Operations** (`os-storage`) — 20 questions
17. **Linux Logs & System Troubleshooting** (`os-logs`) — 20 questions
18. **Bash Scripting & Automation** (`os-scripting`) — 20 questions
19. **Virtualization & Containers** (`os-virtualization`) — 20 questions
20. **Linux Security & System Hardening** (`os-linux-security`) — 20 questions

## Bank size

- Topics: **42** (22 networking; 20 operating-system/Linux).
- Questions in seed: **872** (32 retained original items plus 840 new items).
- Primary lesson records: **42**, each with a structured explanation, examples, practical activity, glossary, source links, and a 3-question knowledge check.
- Questions remain `verified: false` until a human reviewer validates the answer, explanation, and its supporting reference. They should not be labeled verified just because a source URL is attached.
- Original questions are preserved and existing topic IDs are retained. The source mismatch on `net-transport-002` was corrected from UDP RFC 768 to TCP RFC 9293.

## Import

After the existing database schema and `DATABASE_URL` are configured in Replit, run:

```sh
pnpm --filter @workspace/api-server run import:questions
```

The import updates/creates the 42 topics and all question/source records. The lesson articles are served from the frontend bundle and do not need a database migration.

## Content-review note

This is a substantial authored draft intended for study and lab practice. The included source links are supporting references, not proof of a completed independent fact-check. Keep all questions unverified until manually reviewed; review standards should focus especially on scenario distractors, platform-specific behavior, and standards-version details.
