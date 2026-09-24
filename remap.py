import re,sys,glob,colorsys
files=[f for f in glob.glob('src/screens/*.tsx')]
skip={'src/screens/HomeScreen.tsx','src/screens/LoginScreen.tsx'}
INK='#1F1A3D'; MUTED='#5B5680'; PRIMARY='#6D28D9'; PRIMARY_TINT='#6D28D91A'; SURFACE='#FFFFFF'; SOFT='#F5F0FF'; LINE='#E6DCF7'; BG='#FFF7F0'
def parse(h):
    h=h.lstrip('#')
    if len(h)==3: h=''.join(c*2 for c in h)
    r,g,b=int(h[0:2],16),int(h[2:4],16),int(h[4:6],16)
    a=h[6:8] if len(h)==8 else ''
    return r,g,b,a
def lum(r,g,b): return (0.2126*r+0.7152*g+0.0722*b)/255
def hsv(r,g,b): return colorsys.rgb_to_hsv(r/255,g/255,b/255)
def kind(r,g,b):
    h,s,v=hsv(r,g,b)
    if s<0.18: return 'neutral'
    d=h*360
    if 195<=d<=260: return 'blue'
    if 160<d<195: return 'teal'
    if d<20 or d>330: return 'red'
    if 20<=d<70: return 'amber'
    if 70<=d<=160: return 'green'
    return 'other'
def remap(prop,hexv):
    r,g,b,a=parse(hexv)
    L=lum(r,g,b); k=kind(r,g,b); alpha=a!=''
    p=prop.lower()
    if 'shadow' in p: return hexv
    if 'placeholder' in p: return '#9A94BC'
    if p in('color','tintcolor'):
        if k=='neutral':
            return INK if L>0.62 else (MUTED if L>0.35 else INK)
        if k in('blue','teal'):
            return '#FFFFFF' if L>0.8 else PRIMARY
        if k=='red': return '#B91C1C' if L>0.6 else '#DC2626'
        if k=='amber': return '#B45309'
        if k=='green': return '#047857'
        return PRIMARY
    if 'border' in p:
        if a in('33','44','55','66','88') or alpha: return LINE
        if k=='blue' and L<0.5 and hsv(r,g,b)[1]>0.6: return PRIMARY
        return LINE
    # backgrounds
    if hexv.lower().startswith('#000000') or (r==g==b==255 and alpha): return hexv
    if alpha:
        if L<0.3 or k in('blue','teal'): return PRIMARY_TINT
        if k=='red': return '#DC26261A'
        if k=='amber': return '#F59E0B22'
        return hexv
    if L>0.82: return hexv if k!='neutral' or L<0.99 else SURFACE
    if k=='blue' and hsv(r,g,b)[1]>0.55 and L>0.12: return PRIMARY
    if k=='red' and L<0.4: return '#FEE2E2'
    if k=='amber' and L<0.4: return '#FEF3C7'
    if k=='teal' and L<0.4: return '#D1FAE5'
    if k=='green' and L<0.4: return '#D1FAE5'
    if L<0.06: return BG
    return SURFACE
pat=re.compile(r"(\b[A-Za-z]*(?:[Cc]olor|[Bb]ackground|[Tt]int)[A-Za-z]*\s*[:=]\s*[{]?\s*)'(#[0-9a-fA-F]{3,8})'")
for f in files:
    if f in skip: continue
    s=open(f,encoding='utf-8').read()
    s2=pat.sub(lambda m:m.group(1)+"'"+remap(m.group(1).split(':')[0].split('=')[0].strip(),m.group(2))+"'",s)
    s2=re.sub(r"\n\s*fontFamily: 'sans-serif-medium',",r"\n    fontWeight: '600',",s2)
    s2=re.sub(r"\n\s*fontFamily: '(?:sans-serif|serif|sans-serif-condensed|sans-serif-light)',","",s2)
    if s2!=s: open(f,'w',encoding='utf-8').write(s2); print('updated',f)
