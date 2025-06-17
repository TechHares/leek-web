// 调试日志函数
export const logDebug = (label, data) => {
  console.log(`==== DEBUG: ${label} ====`);
  console.log(JSON.stringify(data, null, 2));
  console.log('================');
  return data; // 便于链式调用
};

// 对象深拷贝函数
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}; 