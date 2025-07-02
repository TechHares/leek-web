/**
 * 格式化日期
 * @param {string|Date} date 日期对象或日期字符串
 * @param {string} format 格式化模板，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化数字
 * @param {number} num 要格式化的数字
 * @param {number} decimals 小数位数
 * @returns {string} 格式化后的数字字符串
 */
export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || num === '') return '-'
  
  // 处理科学计数法
  const str = String(num)
  let normalStr = str
  if (str.includes('e') || str.includes('E')) {
    const [n, exp] = str.split(/[eE]/)
    const [int, dec = ''] = n.replace('.', '').split('')
    const zeroCount = Math.abs(parseInt(exp)) - 1
    if (exp < 0) {
      normalStr = '0.' + '0'.repeat(zeroCount) + int + dec
    }
  }

  // 格式化小数位数
  const [int, dec = ''] = normalStr.split('.')
  if (decimals === 0) return int
  if (dec.length === 0) return int
  const decimalPart = dec.slice(0, decimals).replace(/0+$/, '')
  return decimalPart ? int + '.' + decimalPart : int
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 

/**
 * 格式化标签（如tag），超出12字符时显示 ...+后9位
 * @param {string} tag
 * @returns {string}
 */
export function formatTag(tag) {
  if (!tag) return '';
  if (tag.length <= 22) return tag;
  return '... ' + tag.slice(-18);
} 