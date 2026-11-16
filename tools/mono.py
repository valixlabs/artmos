import re,sys
KEEP={'#fee500','#191600','#dadce0','#1f1f1f','#4285f4','#34a853','#fbbc05','#ea4335'}
def gray(r,g,b):
    y=round(0.2126*r+0.7152*g+0.0722*b); return max(0,min(255,y))
def hexrep(m):
    h=m.group(0)
    if h.lower() in KEEP: return h
    s=h[1:]
    if len(s) in (3,4): s=''.join(c*2 for c in s)
    if len(s) not in (6,8): return h
    try: r,g,b=int(s[0:2],16),int(s[2:4],16),int(s[4:6],16)
    except: return h
    y=gray(r,g,b); out='#%02x%02x%02x'%(y,y,y)
    if len(s)==8: out+=s[6:8]
    return out
def rgbrep(m):
    fn,args=m.group(1),m.group(2)
    parts=[p.strip() for p in args.split(',')]
    if len(parts)<3: return m.group(0)
    try: r,g,b=[float(p) for p in parts[:3]]
    except: return m.group(0)
    y=gray(r,g,b); rest=parts[3:]
    return f"{fn}({y},{y},{y}{''.join(','+p for p in rest)})"
HEX=re.compile(r'#[0-9a-fA-F]{3,8}\b(?![0-9a-fA-F])')
RGB=re.compile(r'(rgba?)\(([^()$]*)\)')
def conv(t): return RGB.sub(rgbrep, HEX.sub(hexrep,t))
if __name__=='__main__':
    for f in sys.argv[1:]:
        s=open(f,encoding='utf-8').read(); n=conv(s)
        if n!=s: open(f,'w',encoding='utf-8').write(n); print('mono',f)
