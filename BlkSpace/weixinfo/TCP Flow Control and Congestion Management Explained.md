# TCP Flow Control and Congestion Management Explained

**Created:** 10/12/2025, 10:43:11 PM
**Updated:** 10/12/2025, 10:44:05 PM
**Exported:** 6/13/2026, 4:05:10 AM
**Link:** [https://chat.deepseek.com/a/chat/s/2c5a582b-cf24-45de-b0de-f7023b00eeb1](https://chat.deepseek.com/a/chat/s/2c5a582b-cf24-45de-b0de-f7023b00eeb1)

---

## User
**2025-10-13T03:43:13.330Z**

reformat: bold the text for questions in the following text - Moral humility and cross-cultural understanding matter, but some practices are objectively wrong when they systematically cause severe, nonconsensual harm or deny basic agency (e.g., slavery, genocide, child mutilation). Human rights provide a minimal, universal floor that transcends cultural norms, while above that floor many values (rituals, cuisines, dress, etiquette) are legitimately plural. We should distinguish critique of practices from condemnation of people, and prefer engagement over imposition. Epistemic caution is key: judge with good evidence, listen to insiders (especially the most vulnerable), and consider context and consequences. In short, reject absolute relativism and ethnocentrism alike: endorse a thin universalism with thick cultural humility.

“Pawnee Morning Star sacrifice ritual” from the Pawnee (Plains Indigenous peoples of North America).

GBN: On loss of Packet 3, the receiver discards 4 and 5 (out-of-order), and the sender times out and retransmits Packet 3 and all subsequent packets in the window (i.e., 3, 4, and 5). SR: On loss of Packet 3, the receiver buffers correctly received 4 and 5, and the sender retransmits only the missing Packet 3.

The network bottleneck is the narrowest link whose queue builds when the sender’s rate exceeds available capacity; TCP’s congestion control tries to match the sender’s rate to this bottleneck. TCP detects congestion primarily via packet loss (missing ACKs triggering timeout or triple duplicate ACKs) and, in some variants, via rising RTT/ECN marks as early signals. Upon detecting loss via triple duplicate ACKs, TCP performs fast retransmit and enters fast recovery, halving the congestion window (cwnd) and using additive increase afterward. If a timeout occurs, TCP assumes severe congestion: it sets cwnd to 1 MSS (slow start), reduces ssthresh (typically to half of cwnd), and restarts slow start. ECN-capable TCP, on receiving CE marks, cuts cwnd (typically by half) without waiting for loss.

Flow Control prevents the sender from overwhelming the receiver’s buffer (receiver overrun). The receiver manages this by advertising a receive window (rwnd) in ACKs, telling the sender how much data it can accept, thereby throttling the sender.
Question 1 (9 points)

 
Which function is called by the Network Layer when a packet arrives at the receiver side of the channel, initiating the process of checking the packet?

Question 1 options:

rdt_rcv(packet)


udt_send(packet)


deliver_data(data)


rdt_send(data)

Question 2 (9 points)

 
In TCP, if a segment is carrying 1,500 bytes of application data, the sequence number in the segment header refers to which part of the data?

Question 2 options:

The sequence number for the last byte of data in the segment.


The total number of segments sent so far.


The byte stream number of the first byte of data in the segment.


The total number of bytes in the segment ( including header).

Question 3 (7 points)

 
Explain the primary difference between the retransmission strategy of the Go-Back-N (GBN) protocol and the Selective Repeat (SR) protocol when Packet 3 is lost but Packets 4 and 5 are received correctly.

What does the GBN sender retransmit?

What does the SR sender retransmit?

Question 3 options:

Question 4 (9 points)

 
n the Go-Back-N (GBN) protocol, if the receiver is waiting for Packet 5 but receives Packet 6 correctly, what is the receiver's mandatory action?

Question 4 options:

Buffer PAcket 6 and send ACK 6


Deliver Packet 6 immediately and wait for Packet 5.


Discard Packet 6 and re-send the ACK for the last in-order packet (ACK 4)

Question 5 (9 points)

 
In the Selective Repeat protocol, what action does the receiver take immediately upon receiving a correct packet, regardless of whether it is in-order or out-of-order?

Question 5 options:

It waits until the packet is in order before sending an acknowledgment.


It sends an individual acknowledgment (ACK) for that specific packet.


It buffers the packet and waits for a timeout to trigger a cumulative acknowledgment.


It delivers the packet and then advances the window base.

Question 6 (9 points)

 
 Saved
True or False: The transport layer at the sender side passes data to the application layer.

Question 6 options:
	True
	False
Question 7 (9 points)

 
 Saved
True or False: The transport layer at the sender side passes data to the application layer.

Question 7 options:
	True
	False
Question 8 (6 points)

 
Descirbe the role of the bottleneck in TCP congestion control. How does TCP ( the sender) typically detect that it has reached the congestion limit, and what is the immediate action TCP takes in response? 

Question 8 options:

Question 9 (9 points)

 
Which of the following are functions of the transport layer?

Question 9 options:

Logical communication between applications


Network congestion management


Packet routing


Physical signal transmission

Question 10 (9 points)

 
What are the four interfaces of a reliable data transfer protocol (rdt)?

Question 10 options:

rdt_packet, rdt_error, rdt_buffer, rdt_window


rdt_init, rdt_close, rdt_ack, rdt_nak


rdt_request, rdt_response, rdt_error, rdt_timeout


rdt_send, rdt_receive, udt_send, udt_receive

Question 11 (9 points)

 
Which component determines the Receiver Advertised Window size in TCP Flow Control, and what does this value represent?

Question 11 options:

The Sender (Source Host); it represents the maximum data that can be sent before a timeout.

The Receiver (Destination Host); it represents the available buffer space in bytes to temporarily store incoming data.

The Router; it represents the minimum delay (latency) allowed for a segment.

The Network Layer; it represents the maximum packets the router can queue.
Question 12 (6 points)

 
While both aim to limit the sender's rate, TCP's Flow Control and Congestion Control serve fundamentally different purposes. Based on the video, what is the specific problem that Flow Control is designed to prevent, and what mechanism does the receiver use to manage this control?

Question 12 options:

## DeepSeek
**2025-10-13T03:43:13.342Z**

**Moral humility and cross-cultural understanding matter, but some practices are objectively wrong when they systematically cause severe, nonconsensual harm or deny basic agency (e.g., slavery, genocide, child mutilation). Human rights provide a minimal, universal floor that transcends cultural norms, while above that floor many values (rituals, cuisines, dress, etiquette) are legitimately plural. We should distinguish critique of practices from condemnation of people, and prefer engagement over imposition. Epistemic caution is key: judge with good evidence, listen to insiders (especially the most vulnerable), and consider context and consequences. In short, reject absolute relativism and ethnocentrism alike: endorse a thin universalism with thick cultural humility.**

“Pawnee Morning Star sacrifice ritual” from the Pawnee (Plains Indigenous peoples of North America).

GBN: On loss of Packet 3, the receiver discards 4 and 5 (out-of-order), and the sender times out and retransmits Packet 3 and all subsequent packets in the window (i.e., 3, 4, and 5). SR: On loss of Packet 3, the receiver buffers correctly received 4 and 5, and the sender retransmits only the missing Packet 3.

The network bottleneck is the narrowest link whose queue builds when the sender’s rate exceeds available capacity; TCP’s congestion control tries to match the sender’s rate to this bottleneck. TCP detects congestion primarily via packet loss (missing ACKs triggering timeout or triple duplicate ACKs) and, in some variants, via rising RTT/ECN marks as early signals. Upon detecting loss via triple duplicate ACKs, TCP performs fast retransmit and enters fast recovery, halving the congestion window (cwnd) and using additive increase afterward. If a timeout occurs, TCP assumes severe congestion: it sets cwnd to 1 MSS (slow start), reduces ssthresh (typically to half of cwnd), and restarts slow start. ECN-capable TCP, on receiving CE marks, cuts cwnd (typically by half) without waiting for loss.

Flow Control prevents the sender from overwhelming the receiver’s buffer (receiver overrun). The receiver manages this by advertising a receive window (rwnd) in ACKs, telling the sender how much data it can accept, thereby throttling the sender.

**Question 1 (9 points)**
Which function is called by the Network Layer when a packet arrives at the receiver side of the channel, initiating the process of checking the packet?
**Question 1 options:**
rdt_rcv(packet)
udt_send(packet)
deliver_data(data)
rdt_send(data)

**Question 2 (9 points)**
In TCP, if a segment is carrying 1,500 bytes of application data, the sequence number in the segment header refers to which part of the data?
**Question 2 options:**
The sequence number for the last byte of data in the segment.
The total number of segments sent so far.
The byte stream number of the first byte of data in the segment.
The total number of bytes in the segment ( including header).

**Question 3 (7 points)**
Explain the primary difference between the retransmission strategy of the Go-Back-N (GBN) protocol and the Selective Repeat (SR) protocol when Packet 3 is lost but Packets 4 and 5 are received correctly.
What does the GBN sender retransmit?
What does the SR sender retransmit?
**Question 3 options:**

**Question 4 (9 points)**
In the Go-Back-N (GBN) protocol, if the receiver is waiting for Packet 5 but receives Packet 6 correctly, what is the receiver's mandatory action?
**Question 4 options:**
Buffer PAcket 6 and send ACK 6
Deliver Packet 6 immediately and wait for Packet 5.
Discard Packet 6 and re-send the ACK for the last in-order packet (ACK 4)

**Question 5 (9 points)**
In the Selective Repeat protocol, what action does the receiver take immediately upon receiving a correct packet, regardless of whether it is in-order or out-of-order?
**Question 5 options:**
It waits until the packet is in order before sending an acknowledgment.
It sends an individual acknowledgment (ACK) for that specific packet.
It buffers the packet and waits for a timeout to trigger a cumulative acknowledgment.
It delivers the packet and then advances the window base.

**Question 6 (9 points)**
True or False: The transport layer at the sender side passes data to the application layer.
**Question 6 options:**
True
False

**Question 7 (9 points)**
True or False: The transport layer at the sender side passes data to the application layer.
**Question 7 options:**
True
False

**Question 8 (6 points)**
Descirbe the role of the bottleneck in TCP congestion control. How does TCP ( the sender) typically detect that it has reached the congestion limit, and what is the immediate action TCP takes in response?
**Question 8 options:**

**Question 9 (9 points)**
Which of the following are functions of the transport layer?
**Question 9 options:**
Logical communication between applications
Network congestion management
Packet routing
Physical signal transmission

**Question 10 (9 points)**
What are the four interfaces of a reliable data transfer protocol (rdt)?
**Question 10 options:**
rdt_packet, rdt_error, rdt_buffer, rdt_window
rdt_init, rdt_close, rdt_ack, rdt_nak
rdt_request, rdt_response, rdt_error, rdt_timeout
rdt_send, rdt_receive, udt_send, udt_receive

**Question 11 (9 points)**
Which component determines the Receiver Advertised Window size in TCP Flow Control, and what does this value represent?
**Question 11 options:**
The Sender (Source Host); it represents the maximum data that can be sent before a timeout.
The Receiver (Destination Host); it represents the available buffer space in bytes to temporarily store incoming data.
The Router; it represents the minimum delay (latency) allowed for a segment.
The Network Layer; it represents the maximum packets the router can queue.

**Question 12 (6 points)**
While both aim to limit the sender's rate, TCP's Flow Control and Congestion Control serve fundamentally different purposes. Based on the video, what is the specific problem that Flow Control is designed to prevent, and what mechanism does the receiver use to manage this control?
**Question 12 options:**

