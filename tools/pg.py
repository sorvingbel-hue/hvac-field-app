#!/usr/bin/env python3
# usage: pg.py FILE REGEX [maxhits]  -> PDF page (1-based, by \f) : line : text
import sys,re
f,pat=sys.argv[1],re.compile(sys.argv[2],re.I); mx=int(sys.argv[3]) if len(sys.argv)>3 else 20
t=open(f,errors='replace').read(); page=1; n=0
for i,l in enumerate(t.split('\n'),1):
    page_here=page
    page+=l.count('\f')
    if pat.search(l):
        print(f"p{page_here}:L{i}: {l.strip()[:200]}"); n+=1
        if n>=mx: break
