import { v7 } from 'uuid'
export class GenerateIdService {
  generateId(): { id: string } {
    return { id: v7() }
  }
}
