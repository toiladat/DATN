import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

@Injectable()
export class FirebaseMessagingService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseMessagingService.name)
  private firebaseApp: admin.app.App

  onModuleInit() {
    try {
      const keyPath = path.resolve(process.cwd(), 'src/shared/config/firebase-service-account.json')

      if (!fs.existsSync(keyPath)) {
        this.logger.warn(`Firebase credentials not found at ${keyPath}. Push notifications will be disabled.`)
        return
      }

      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'))

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      this.logger.log('Firebase Admin SDK initialized successfully.')
    } catch (err) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', err)
    }
  }

  async sendMulticastNotification(tokens: string[], payload: { title: string; body: string; projectId?: string }) {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase App not initialized. Skipping push notification.')
      return
    }

    if (!tokens || tokens.length === 0) {
      return
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.projectId ? { projectId: payload.projectId } : {},
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      }

      const response = await admin.messaging().sendEachForMulticast(message)
      this.logger.log(`Successfully sent ${response.successCount} push notifications; failed: ${response.failureCount}`)
    } catch (err) {
      this.logger.error('Failed to send multicast push notifications:', err)
    }
  }
}
