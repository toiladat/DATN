import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ClassSerializerInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface Response<T> {
  data: T
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    // 1) Tạo ClassSerializerInterceptor thủ công
    const serializerInterceptor = new ClassSerializerInterceptor(this.reflector)

    // 2) Chạy serialize trước (ẩn @Exclude, áp dụng @Expose/@Transform, @SerializeOptions, …)
    const transformed = serializerInterceptor.intercept(context, next)

    // 3) Bọc lại output thành { data, statusCode }
    return transformed.pipe(
      map((data) => ({
        data,
        statusCode: context.switchToHttp().getResponse().statusCode,
      })),
    )
  }
}
