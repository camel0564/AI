/**
 * 定义一个 cell 装饰器
 * 按顺序收集类所有的方法名称; 用于后续自动调用最新的方法
 *
 * target.constructor 可以编辑对象
 * propertyKey 属性名/方法名
 * descriptor.value 可以获取到方法实例
 */
export function cell(target: any, propertyKey: string, _descriptor: TypedPropertyDescriptor<any>) {
  // 将方法名称和方法按顺序添加到 cells 中, 用于后续运行
  target.constructor.cells.push(propertyKey)
}
