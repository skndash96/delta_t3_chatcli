# Delta Task 3

## Task 3A
This repo is the dockerized chat CLI application.

#### Setup 
1. Clone the repository
2. Run `docker compose up --build` to start the containers
3. Cd into `client` directory
4. Run `pnpm run dev <register|login>` and enter the credentials
5. Run `pnpm run dev` and use the CLI application the interact with the server at port `3000` and database at port `5432`

## Task 3B Reverse engineering
Smallest solution is with 12 charecters - `zp|}un|~~~~W`  
Exploit:  
```py
from z3 import *
KEY = 315525

for LEN in range(1, 31):
  s = Solver()

  x = [BitVec(f'x{i}', 8) for i in range(LEN)]
  LEN = len(x)

  terms = []

  for i in range(LEN):
    s.add(x[i] >= 32, x[i] <= 126)

    xi = ZeroExt(24, x[i])
    
    term = (
      (xi * xi) +
      (xi * (100 - i)) +
      BitVecVal(i, 32) +
      (xi * 7) +
      ((xi | BitVecVal(i, 32)) & BitVecVal(i + 3, 32))
    ) - ((xi * xi) % BitVecVal(i + 1, 32))
    
    terms.append(term)

  s.add(Sum(terms) == BitVecVal(KEY, 32))

  if s.check() == sat:
    m = s.model()
    print(f'Found solution for {LEN} variables:')
    for j in range(LEN):
      print(chr(m[x[j]].as_long()), end='')
    print()
  else:
    print(f'No solution found for {LEN} variables.')
```

## Task 3B Web JWT Vulnerablity
The Chatcli Server has this builtin vulnerablity.

Surf through the code to find a hint about the JWT secret. Craft JWTs with all possible secrets and with necessary payload to make the server return the flag.  

`GET /flag` is the endpoint

## Task 3B Crypto
```py
import random
p = 65537  

def find_g(p):
    for g in range(2, p):
        if all(pow(g, (p - 1) // d, p) != 1 for d in range(2, int(pow(p - 1, 0.5) + 1))):
            return g
    return None
  
g = find_g(p)

if g is None:
    raise ValueError("No primitive root found for p")
  
def generate_private_key():
  return random.randint(1, p - 2)

a = generate_private_key()
b = generate_private_key()

def generate_public_key(private_key):
    return pow(g, private_key, p)
  
A = generate_public_key(a)  
B = generate_public_key(b)

def generate_shared_secret(public_key, private_key):
    return pow(public_key, private_key, p)

shared_secret_a = generate_shared_secret(B, a)
shared_secret_b = generate_shared_secret(A, b)

assert shared_secret_a == shared_secret_b, "Shared secrets do not match"

print(f"""\
p = {p}
g = {g}
Private key for Alice (a) = {a}
Public key for Alice (A) = {A}
Private key for Bob (b) = {b}
Public key for Bob (B) = {B}
Shared secret for Alice = {shared_secret_a}
Shared secret for Bob = {shared_secret_b}
Shared secrets match: {shared_secret_a == shared_secret_b}
""")

a_brute = None
b_brute = None
shared_secret_brute = None

def brute_force_shared_secret():
  global a_brute, b_brute, shared_secret_brute

  for i in range(1, p):
    if pow(g, i, p) == A:
        a_brute = i
    if pow(g, i, p) == B:
        b_brute = i

  if a_brute is not None and b_brute is not None:
    shared_secret_brute = pow(B, a_brute, p)

brute_force_shared_secret()

if shared_secret_brute is not None:
    print(f"Brute-forced private key for Alice (a_brute) = {a_brute}")
    print(f"Brute-forced private key for Bob (b_brute) = {b_brute}")
    print(f"Brute-forced shared secret = {shared_secret_brute}")
    print(f"Brute-forced shared secrets match: {shared_secret_brute == shared_secret_a}")
else:
    print("Failed to brute-force shared secret.")
print()
  
bsgs_a = None
bsgs_b = None
bsgs_shared_secret = None

def baby_step_giant_step():
  global bsgs_a, bsgs_b, bsgs_shared_secret
  
  m = int(pow(p, 0.5)) + 1
  
  table = {pow(g, j, p): j for j in range(m)}

  for i in range(m):
    y = (A * pow(g, -m*i, p)) % p
    if y in table:
        bsgs_a = i*m + table[y]
        break

  for i in range(m):
    y = (B * pow(g, -m*i, p)) % p
    if y in table:
        bsgs_b = i*m + table[y]
        break
      
  if bsgs_a is not None and bsgs_b is not None:
    bsgs_shared_secret = pow(B, bsgs_a, p)

baby_step_giant_step()

if bsgs_shared_secret is not None:
    print(f"Baby-step giant-step private key for Alice (bsgs_a) = {bsgs_a}")
    print(f"Baby-step giant-step private key for Bob (bsgs_b) = {bsgs_b}")
    print(f"Baby-step giant-step shared secret = {bsgs_shared_secret}")
    print(f"Baby-step giant-step shared secrets match: {bsgs_shared_secret == shared_secret_a}")
else:
    print("Failed to find shared secret using baby-step giant-step method.")
print()
```

## Task 3B Forensics
Below file will split the secret into 3 parts, hide each into three seperate images
```sh
#!/bin/bash

secret="flag{you_got_me}"
len=${#secret}
part_len=$((len/3))

p1=${secret:0:part_len}
p2=${secret:part_len:part_len}
p3=${secret:$((2*part_len))}

tmp=$(mktemp)

IMG="~/sample.png"
KEY=123

# steghide doesn't support png, so i went with bmp

convert sample.png -define bmp:format=bmp3 sample_1.bmp
cp sample_1.bmp sample_2.bmp
cp sample_1.bmp sample_3.bmp

echo $p1 > $tmp
steghide embed -f -cf sample_1.bmp -ef $tmp -p $KEY

echo $p2 > $tmp
steghide embed -f -cf sample_2.bmp -ef $tmp -p $KEY

echo $p3 > $tmp
steghide embed -f -cf sample_3.bmp -ef $tmp -p $KEY

rm $tmp
```

This python server will serve the bmp files. 
```py
from flask import Flask, send_file, abort

app = Flask(__name__)

FILES = {
    "/file1.bmp": "sample_1.bmp",
    "/file2.bmp": "sample_2.bmp",
    "/file3.bmp": "sample_3.bmp"
}

@app.route("/<filename>")
def serve_file(filename):
    path = f"sample_{filename[-5]}.bmp"  # crude mapping from 'file1.bmp' → 'sample_1.bmp'
    if path in FILES.values():
        return send_file(path, mimetype="image/bmp")
    else:
        abort(404)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

Below command captures the packet in loopback interface. For some reason `f.pcap` must be owned by super user ([bug](https://www.linuxquestions.org/questions/linux-networking-3/tshark-gives-permission-denied-writing-to-any-file-in-home-dir-650952/))
```
sudo tshark -i lo -w f.pcap
```
When capturing packets, curl the server using `curl http://localhost:8080/file1.bmp -o f.bmp` for all 3 files.  
The pcap can then be analysed to get the three pictures, and then run `steghide extract` with the password to reveal the secrets 

## 3B Binary Exploitation
The C code contains the required vulnerablities
```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

void win() {
    system("cat flag.txt");
}

void vuln() {
    char buf[64];
    char input[128];
    puts("input:");
    fgets(input, sizeof(input), stdin);
    printf(input);  //format string vulnerability

    strcpy(buf, input);  //buffer overflow (no bounds check)
}

int main() {
    setbuf(stdout, NULL);
    vuln();
    return 0;
}
```
I'll learn the tools to exploit and update here soon 🙂
