import { EventEmitter } from 'events';
import { parseVote } from './chat-parser.js';

export interface MockChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

const MOCK_NAMES = [
  'Carlos_Racing', 'Ana_V8', 'PedroDrift', 'MaríaTurbo', 'LuisNitro',
  'SofíaGP', 'DiegoRPM', 'LauraSpeed', 'JorgeLap', 'ElenaPit',
  'RobertoFlug', 'CarmenAcel', 'FernandoGP2', 'IsabelPista', 'RicardoRT',
  'ValentinaVuelta', 'SergioBox', 'PatriciaPole', 'MiguelDraft', 'LucíaBrake',
  'AndrésClutch', 'GabrielaTire', 'RaúlShift', 'DianaFuel', 'Fernando exhaust',
  'MartínApex', 'CarolinaTorque', 'EmilioGrip', 'NataliaRev', 'PabloSlipstream',
];

const MOCK_MESSAGES = [
  '¡Vamos!', 'Increíble carrera', 'Go go go!', 'Qué pasada',
  'Jaja', 'Bien!', 'Rápido!', 'A por ellos',
  'Vamos #XX!', 'XX va a ganar', 'XX es el mejor', 'Apoyo a #XX',
  'XX supremacy', 'Let\'s go #XX', 'Vamos por #XX',
  'Esto está crazy', 'W race', 'GG', 'No way',
  'XX tiene que ganar', 'Voto por #XX', '#XX champion',
];

const CAR_NUMBERS = ['01', '03', '05', '07', '08', '11', '14', '17', '22', '25', '33', '42', '55', '69', '77', '88', '99'];

export class MockChatService extends EventEmitter {
  private interval: ReturnType<typeof setInterval> | null = null;
  private messageCounter = 0;
  private activeUsers: Map<string, { name: string; hasVoted: boolean; hasPredicted: boolean }> = new Map();

  constructor(
    private streamId: string,
    private intervalMs: number = 2000,
    private voteProbability: number = 0.6,
    private predictionProbability: number = 0.3,
  ) {
    super();
  }

  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      const msg = this.generateMessage();
      this.emit('message', msg);
    }, this.intervalMs + Math.random() * 1000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private generateMessage(): MockChatMessage {
    this.messageCounter++;
    const userId = this.getOrCreateUser();
    const user = this.activeUsers.get(userId)!;

    let message: string;

    if (!user.hasPredicted && Math.random() < this.predictionProbability) {
      const carNum = CAR_NUMBERS[Math.floor(Math.random() * CAR_NUMBERS.length)];
      message = `!predict #${carNum}`;
      user.hasPredicted = true;
    } else if (!user.hasVoted && Math.random() < this.voteProbability) {
      const carNum = CAR_NUMBERS[Math.floor(Math.random() * CAR_NUMBERS.length)];
      const templates = [
        `¡Vamos #${carNum}!`,
        `#${carNum} va a ganar`,
        `#${carNum}`,
        `Apoyo a #${carNum}`,
        `Go #${carNum}!`,
        `#${carNum} champion`,
      ];
      message = templates[Math.floor(Math.random() * templates.length)];
      user.hasVoted = true;
    } else {
      const template = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
      const randomCar = CAR_NUMBERS[Math.floor(Math.random() * CAR_NUMBERS.length)];
      message = template.replace(/#?XX/g, randomCar);
    }

    return {
      id: `mock_${this.messageCounter}_${Date.now()}`,
      userId,
      userName: user.name,
      message,
      timestamp: Date.now(),
    };
  }

  private getOrCreateUser(): string {
    if (this.activeUsers.size === 0 || Math.random() < 0.3) {
      const available = MOCK_NAMES.filter(n => !this.activeUsers.has(n));
      if (available.length > 0) {
        const name = available[Math.floor(Math.random() * available.length)];
        this.activeUsers.set(name, { name, hasVoted: false, hasPredicted: false });
        return name;
      }
    }

    const users = Array.from(this.activeUsers.keys());
    return users[Math.floor(Math.random() * users.length)];
  }
}
