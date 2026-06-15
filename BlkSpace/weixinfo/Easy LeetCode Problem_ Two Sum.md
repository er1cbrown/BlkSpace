# Easy LeetCode Problem: Two Sum

**Created:** 8/5/2025, 6:46:06 PM
**Updated:** 8/5/2025, 6:52:34 PM
**Exported:** 6/13/2026, 4:05:19 AM
**Link:** [https://chat.deepseek.com/a/chat/s/1cdeab0d-9c69-4e70-867f-cd891e818eed](https://chat.deepseek.com/a/chat/s/1cdeab0d-9c69-4e70-867f-cd891e818eed)

---

## User
**2025-08-05T23:46:08.376Z**

give me an easy level leetcode problem to solve dont give me the answer

## DeepSeek
**2025-08-05T23:46:08.379Z**

Sure! Here's an easy-level LeetCode problem for you to solve:  

### **Problem: Two Sum**  
**Description:**  
Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.  

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.  

**Example:**  
- Input: `nums = [2,7,11,15]`, `target = 9`  
- Output: `[0,1]` (because `nums[0] + nums[1] = 2 + 7 = 9`)  

**Constraints:**  
- `2 <= nums.length <= 10^4`  
- `-10^9 <= nums[i] <= 10^9`  
- `-10^9 <= target <= 10^9`  

Try solving it efficiently! Let me know if you need any hints. 😊

## User
**2025-08-05T23:52:09.978Z**

solve the problem so i can compare my answer to the right answer

## DeepSeek
**2025-08-05T23:52:09.980Z**

### **Solution to "Two Sum" Problem**

#### **Approach: Hash Map (Optimal)**
We can solve this problem efficiently using a hash map (dictionary) to store the numbers we've seen so far along with their indices. For each number in the array, we check if `(target - current number)` exists in the hash map. If it does, we return the indices. Otherwise, we store the current number and its index in the hash map.

#### **Solution Code (Python)**
```python
def twoSum(nums, target):
    num_map = {}  # Stores {number: index}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []  # As per problem statement, a solution always exists
```

#### **Explanation:**
1. **Initialization:** We create an empty dictionary `num_map` to store numbers and their indices.
2. **Iteration:** We loop through each number in `nums` using `enumerate` to get both the index (`i`) and the value (`num`).
3. **Check Complement:** For each `num`, we compute `complement = target - num` and check if it exists in `num_map`.
   - If it does, we return `[num_map[complement], i]` (the indices of the two numbers that sum to `target`).
   - If not, we store `num` and its index `i` in `num_map` for future checks.
4. **Return Statement:** The problem guarantees a solution, so we don’t need to handle the case where no solution exists.

#### **Time Complexity:**  
- **O(n)** – We traverse the list once, and each hash map lookup is **O(1)** on average.  

#### **Space Complexity:**  
- **O(n)** – In the worst case, we store all `n` elements in the hash map.

---

### **Example Walkthrough:**
Let’s take `nums = [2, 7, 11, 15]` and `target = 9`:
1. **i = 0, num = 2**  
   - `complement = 9 - 2 = 7`  
   - `7` is not in `num_map` → store `{2: 0}`  
2. **i = 1, num = 7**  
   - `complement = 9 - 7 = 2`  
   - `2` is in `num_map` → return `[num_map[2], 1]` → `[0, 1]`  

The solution is correct because `nums[0] + nums[1] = 2 + 7 = 9`.

---

### **Alternative Approaches (For Comparison)**
1. **Brute Force (O(n²)):**  
   - Check all possible pairs using nested loops.  
   - Works but inefficient for large inputs.  
2. **Two-Pointer (O(n log n)):**  
   - Sort the array and use two pointers (but requires storing original indices).  
   - Less efficient than the hash map approach.  

The **hash map method** is optimal for this problem. Let me know if you'd like any clarifications! 😊

