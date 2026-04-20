export const topologyData = {
    nodes: [
        { id: '1', name: 'Core Switch 01', type: 'network', status: 'normal', group: 1 },
        { id: '2', name: 'OpenStack Controller', type: 'cloud', status: 'warning', group: 2 },
        { id: '3', name: 'Docker Node 1', type: 'container', status: 'danger', group: 3 },
        { id: '4', name: 'Docker Node 2', type: 'container', status: 'normal', group: 3 },
        { id: '5', name: 'DB Server (Postgres)', type: 'database', status: 'normal', group: 4 },
    ],
    links: [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
        { source: '2', target: '4' },
        { source: '3', target: '5' },
        { source: '4', target: '5' },
    ]
};

export const resourceMetrics = [
    { time: '10:00', cpu: 45, memory: 60, network: 120 },
    { time: '10:05', cpu: 55, memory: 62, network: 150 },
    { time: '10:10', cpu: 60, memory: 65, network: 180 },
    { time: '10:15', cpu: 85, memory: 70, network: 250 },
    { time: '10:20', cpu: 95, memory: 85, network: 320 },
    { time: '10:25', cpu: 92, memory: 88, network: 310 },
    { time: '10:30', cpu: 98, memory: 92, network: 400 },
];

export const systemAlerts = [
    { id: 1, level: 'danger', title: '컨테이너(Docker Node 1) 크래시', time: '오전 10:28', description: '컨테이너 오케스트레이터가 응답하지 않습니다.' },
    { id: 2, level: 'warning', title: '클라우드(OpenStack) CPU 사용량 경고', time: '오전 10:20', description: '컨트롤러 노드의 CPU 사용량이 85%를 초과했습니다.' },
    { id: 3, level: 'normal', title: 'DB 백업 완료', time: '오전 09:00', description: 'Postgres 일일 백업 작업이 성공적으로 완료되었습니다.' },
];
