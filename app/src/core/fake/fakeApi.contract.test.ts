import { runContractSuite } from '../api/contract.suite';
import { createFakeApi } from './fakeApi';

runContractSuite('API falsa', () => createFakeApi({ seed: 'vazio', latency: () => 0 }));
