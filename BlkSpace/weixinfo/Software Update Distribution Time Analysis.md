# Software Update Distribution Time Analysis

**Created:** 9/29/2025, 9:34:47 PM
**Updated:** 9/29/2025, 9:35:57 PM
**Exported:** 6/13/2026, 4:05:11 AM
**Link:** [https://chat.deepseek.com/a/chat/s/9f23d817-7484-451b-90f7-26135d59c940](https://chat.deepseek.com/a/chat/s/9f23d817-7484-451b-90f7-26135d59c940)

---

## User
**2025-09-30T02:34:48.824Z**

A global software company is releasing a major update for its flagship game. The
update patch is a large file with a size of F=65 Gbits. The company uses a central server with
an upload speed of us
=50 Mbps to distribute the patch. The update is being downloaded by N
users, each with a very fast download speed of di=1000 Mbps.
To accelerate the distribution, users also participate in a Peer-to-Peer (P2P) network, where
they upload parts of the patch to other users at a personal upload speed of u.
Prepare a chart that provides the minimum distribution time for a Client-Server and a P2P
architecture for the following combinations of users and personal upload speeds:
N=60 users and u=500 Kbps
N=100 users and u=1 Mbps
Show your detailed calculations for each of the four scenarios.

## DeepSeek
**2025-09-30T02:34:48.837Z**

Alright — let’s go step-by-step.  

We have:  

- **File size** \( F = 65 \ \text{Gbits} = 65,000 \ \text{Mb} \)  
- **Server upload speed** \( u_s = 50 \ \text{Mbps} \)  
- **Each user download speed** \( d_i = 1000 \ \text{Mbps} \) (very fast, so not a bottleneck)  
- **Personal upload speed** \( u \) (varies)  
- **Number of users** \( N \) (varies)  

---

## **1. Formulas**

### **Client-Server (CS) time**
In CS, the server must send the entire file to each of the \( N \) users.  
Server’s total upload capacity = \( u_s \).  

\[
T_{CS} = \frac{F \cdot N}{u_s}
\]
(But note: This assumes the server can serve all users simultaneously at full rate \(u_s\), which is not true if \(u_s/N < d_i\) — but here \(u_s/N\) is small, so the server is the bottleneck and we use the above.)

Actually, careful: In CS, the server uploads the entire file \(F\) to each of \(N\) users, so total uploaded bits = \(N \cdot F\).  
If the server’s upload capacity is \(u_s\) (in Mbps), then time is:

\[
T_{CS} = \frac{N \cdot F}{u_s}
\]
where \(u_s\) is in Mbps, \(F\) in Mbits.

---

### **P2P time**
For P2P, we use the model from the textbook (Kurose & Ross):

\[
T_{P2P} = \max\left\{ \frac{F}{u_s}, \frac{F}{d_{\min}}, \frac{N \cdot F}{u_s + \sum_{i=1}^N u_i} \right\}
\]
Here \(d_{\min} = 1000\) Mbps (very large), so \(F/d_{\min}\) is small.  
Also \(u_i = u\) for all \(i\).  

So:
\[
T_{P2P} \approx \max\left\{ \frac{F}{u_s}, \frac{N \cdot F}{u_s + N \cdot u} \right\}
\]
because \(F/d_{\min} \approx 65,000 / 1000 = 65 \ \text{s}\) is small compared to others in some cases, but let's check.

---

## **2. Scenarios**

### **Case 1: \(N=60, u=500 \ \text{Kbps} = 0.5 \ \text{Mbps}\)**

**CS:**
\[
T_{CS} = \frac{60 \times 65,000}{50} = \frac{3,900,000}{50} = 78,000 \ \text{s}
\]
\(78,000 \ \text{s} / 3600 \approx 21.67 \ \text{hours}\).

**P2P:**
First term: \(F/u_s = 65,000 / 50 = 1300 \ \text{s}\).  

Second term: \( \frac{N \cdot F}{u_s + N \cdot u} = \frac{3,900,000}{50 + 60 \times 0.5} = \frac{3,900,000}{50 + 30} = \frac{3,900,000}{80} = 48,750 \ \text{s} \).

Third term \(F/d_{\min} = 65 \ \text{s}\) (negligible).

Max = \(48,750 \ \text{s} \approx 13.54 \ \text{hours}\).

---

### **Case 2: \(N=100, u=0.5 \ \text{Mbps}\)**

**CS:**
\[
T_{CS} = \frac{100 \times 65,000}{50} = \frac{6,500,000}{50} = 130,000 \ \text{s} \ (\approx 36.11 \ \text{hr})
\]

**P2P:**
\(F/u_s = 1300 \ \text{s}\)  
\( \frac{N \cdot F}{u_s + N \cdot u} = \frac{6,500,000}{50 + 100 \times 0.5} = \frac{6,500,000}{50 + 50} = \frac{6,500,000}{100} = 65,000 \ \text{s} \ (\approx 18.06 \ \text{hr})\)

Max = \(65,000 \ \text{s}\).

---

### **Case 3: \(N=60, u=1 \ \text{Mbps}\)**

**CS:** same as Case 1: \(78,000 \ \text{s}\).

**P2P:**
\(F/u_s = 1300 \ \text{s}\)  
\( \frac{N \cdot F}{u_s + N \cdot u} = \frac{3,900,000}{50 + 60 \times 1} = \frac{3,900,000}{110} \approx 35,455 \ \text{s} \ (\approx 9.85 \ \text{hr})\)

Max = \(35,455 \ \text{s}\).

---

### **Case 4: \(N=100, u=1 \ \text{Mbps}\)**

**CS:** same as Case 2: \(130,000 \ \text{s}\).

**P2P:**
\(F/u_s = 1300 \ \text{s}\)  
\( \frac{N \cdot F}{u_s + N \cdot u} = \frac{6,500,000}{50 + 100 \times 1} = \frac{6,500,000}{150} \approx 43,333 \ \text{s} \ (\approx 12.04 \ \text{hr})\)

Max = \(43,333 \ \text{s}\).

---

## **3. Summary table (seconds)**

| Scenario            | CS time (s)   | P2P time (s)  |
|---------------------|---------------|---------------|
| N=60, u=0.5 Mbps    | 78,000        | 48,750        |
| N=100, u=0.5 Mbps   | 130,000       | 65,000        |
| N=60, u=1 Mbps      | 78,000        | 35,455        |
| N=100, u=1 Mbps     | 130,000       | 43,333        |

---

## **4. Chart**

We can plot **Distribution Time (hours)** vs **Scenario** for CS and P2P.

**In hours:**

| Scenario            | CS (hr)   | P2P (hr)  |
|---------------------|-----------|-----------|
| N=60, u=0.5 Mbps    | 21.67     | 13.54     |
| N=100, u=0.5 Mbps   | 36.11     | 18.06     |
| N=60, u=1 Mbps      | 21.67     | 9.85      |
| N=100, u=1 Mbps     | 36.11     | 12.04     |

---

**Bar chart description** (text-based):  

```
Distribution Time (hours)
40 |
35 | ***** CS
30 | *****
25 |
20 | ***** P2P
15 | ***** *****
10 | ***** *****
 5 |
 0 +------------------------
   60/0.5 100/0.5 60/1 100/1
   (Scenario N/u in Mbps)
```

Where:  
- CS: 21.67, 36.11, 21.67, 36.11  
- P2P: 13.54, 18.06, 9.85, 12.04  

---

**Final note:**  
P2P significantly reduces time when \(u\) is larger and \(N\) is large for CS.  
The P2P time increases with \(N\) when \(u\) is small, but much less than CS.

