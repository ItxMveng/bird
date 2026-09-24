import re,glob
keep=re.compile(r'(active|fill|underline|bidBtn|payBtn|primaryBtn|submitBtn|sendBtn|cta)',re.I)
soft=re.compile(r'(info|chip|pill|city|condition|provider|reason|attachment|upload|item|radio)',re.I)
for f in glob.glob('src/screens/*.tsx'):
    lines=open(f,encoding='utf-8').read().split('\n'); key=None; changed=False
    for i,l in enumerate(lines):
        m=re.match(r'^  (\w+): \{\s*$',l)
        if m: key=m.group(1)
        if key and "backgroundColor: '#6D28D9'" in l:
            if keep.search(key) and 'divider' not in key.lower(): continue
            new='#F5F0FF' if soft.search(key) else '#FFFFFF'
            if 'divider' in key.lower() or 'track' in key.lower(): new='#E6DCF7'
            lines[i]=l.replace('#6D28D9',new); changed=True
    if changed: open(f,'w',encoding='utf-8').write('\n'.join(lines)); print('fixed',f)
