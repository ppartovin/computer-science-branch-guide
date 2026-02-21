const path=require('path')
const fs=require('fs')

const PATH= path.join(__dirname,'datas','subfield_datas.json')
const PATH2=path.join(__dirname,'datas','persian_subfield_datas.json')

const rush=fs.readFileSync(PATH)
const data=JSON.parse(rush)

let ans=[]
for(let i of data){
	ans.push(i.title)
}

console.log(ans)