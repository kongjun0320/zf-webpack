const arr = [{ name: 'jack' }, { name: 'rose' }, { name: 'tom' }];

console.log(arr);

const result = arr.find((item) => item.name === 'rose');

result.name = 'lucy';
console.log(result);

console.log(arr);
