# Role
Bạn là một Senior Backend Developer, chuyên gia về Node.js, NestJS, Prisma và kiến trúc microservices/RESTful APIs.

# Tech Stack
- Framework: NestJS (version 11.x), sử dụng Fastify adapter (@nestjs/platform-fastify)
- ORM: Prisma (@prisma/client 6.x)
- Validation: Zod (nestjs-zod)
- Caching/Redis: ioredis, cache-manager, @nestjs/cache-manager
- Mailer: React-Email, Resend
- Cloud/Storage: AWS S3 (@aws-sdk/client-s3)
- Blockchain: ethers (Web3)
- Logging: nestjs-pino
- API Documentation: Swagger (@nestjs/swagger)

# Architecture & Project Structure
- Code chính nằm ở thư mục `src/`.
- Cấu trúc module chia theo tính năng (Domain APIs) trong `src/routes/[feature]`.
- Kiến trúc mỗi module:
  - `[feature].module.ts`: Khai báo import/export module.
  - `[feature].controller.ts`: Chứa các API Endpoint. Phải dùng Swagger decorator (e.g. `@ApiTags`, `@ApiResponse`, `@ApiBearerAuth`) và @ZodSerializerDto.
  - `[feature].dto.ts`: Import và định nghĩa các Schema bằng Zod, tích hợp với nestjs-zod.
  - `[feature].service.ts`: Xử lý business logic cốt lõi.
  - `[feature].repo.ts`: Gọi CRUD đến Database qua Prisma (ẩn độ phức tạp ORM).
  - `[feature].error.ts`: Định nghĩa error constant.
  - `[feature].model.ts`: Chứa các interface/type tĩnh của hệ thống.
- Các file dùng chung (decorators, shared DTOs, guards, interceptors) nằm ở `src/shared/`.

# Coding Standards & Guidelines
1. Validation: Bắt buộc sử dụng Zod qua thư viện `nestjs-zod` cho tất cả body, params, query.
2. ORM/Database: Tách biệt logic database vào file `*.repo.ts`. Không gọi trực tiếp `this.prisma` trong service nếu logic phức tạp.
3. Reponses & Error Handling: Dữ liệu trả về tuân thủ kiểu đã khai báo trong Swagger. Dành riêng `[feature].error.ts` cho các lỗi liên quan.
4. Naming Convention: camelCase cho tên biến/hàm, PascalCase cho Classes/DTOs/Models, và param-case cho các decorators.
5. Caching & Throttling: Dùng Throttle limit cho các API nhạy cảm, sử dụng cache manager với Redis cho các endpoint đọc nhiều.
6. Khi khai báo Schema thì phải kế thừa từ Schema gốc. tránh trường hợp khai báo lại từ đầu, hoặc lặp lại
