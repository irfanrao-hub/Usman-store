import json, urllib.request, concurrent.futures, re, html, os
r=json.load(open('docs/reference-audit.json')); jobs={}
for i,im in enumerate(r[3]['images'][:18]): jobs[f'product-{i+1}.jpg']=re.sub(r'width=\d+','width=1000',im['src'])
for i,im in enumerate(r[4]['images'][2:7]): jobs[f'gallery-{i+1}.jpg']=re.sub(r'width=\d+','width=1200',im['src'])
s=open('/private/tmp/hanger-home.html').read()
for name,match in [('hero','new.jpg'),('denim','BANNER_JEANS.jpg'),('category-tees','BANNER_TSHIRTS.jpg'),('category-shirts','IMG_1371.jpg'),('category-denim','IMG_0994_2.jpg')]:
 u=re.search(r'(?:src|data-src)="([^"]*'+re.escape(match)+r'[^\"]*)',s)
 if u: jobs[name+'.jpg']='https:'+re.sub(r'width=\d+','width=1600',html.unescape(u[1]))
def get(job):
 name,url=job
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=60) as f: data=f.read()
  if len(data)<1000:raise Exception('Not an image')
  open('public/images/'+name,'wb').write(data);return {'file':'/images/'+name,'source':url,'bytes':len(data)}
 except Exception as e:return {'file':name,'source':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: result=list(pool.map(get,jobs.items()))
json.dump(result,open('docs/asset-sources.json','w'),indent=2)
print(json.dumps(result,indent=2))
