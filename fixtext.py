import re,glob
pat=re.compile(r'(textactive|activetext|bidbtntext|paybtntext|primarybtntext|submittext)',re.I)
for f in glob.glob('src/screens/*.tsx'):
    lines=open(f,encoding='utf-8').read().split('\n'); key=None; ch=False
    for i,l in enumerate(lines):
        m=re.match(r'^  (\w+): \{\s*$',l)
        if m: key=m.group(1)
        if key and pat.search(key) and re.search(r"^\s+color: '#[0-9A-Fa-f]{6}',",l) and "'#FFFFFF'" not in l:
            lines[i]=re.sub(r"'#[0-9A-Fa-f]{6}'","'#FFFFFF'",l); ch=True
    if ch: open(f,'w',encoding='utf-8').write('\n'.join(lines)); print('text fixed',f)
