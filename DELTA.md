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