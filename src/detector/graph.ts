/**
 * Wallet Graph Analyzer
 * 
 * Builds and analyzes relationships between wallets to detect
 * coordinated activity like bundling and wash trading.
 */

interface WalletNode {
  address: string;
  firstSeen: number;
  transactionCount: number;
  totalVolume: number;
  fundingSources: string[];
  fundingTargets: string[];
  buyTimestamps: number[];
}

interface WalletEdge {
  from: string;
  to: string;
  type: 'funding' | 'transfer' | 'trade';
  amount: number;
  timestamp: number;
}

interface ClusterResult {
  clusterId: string;
  wallets: string[];
  centerWallet: string;
  totalVolume: number;
  avgAge: number;
  suspicionScore: number;
  reasons: string[];
}

export class WalletGraphAnalyzer {
  private nodes: Map<string, WalletNode> = new Map();
  private edges: WalletEdge[] = [];
  private adjacencyList: Map<string, Set<string>> = new Map();

  /**
   * Add a wallet to the graph
   */
  addWallet(
    address: string,
    firstSeen: number,
    fundingSources: string[] = [],
    fundingTargets: string[] = []
  ): void {
    const existing = this.nodes.get(address);
    
    if (existing) {
      existing.fundingSources.push(...fundingSources);
      existing.fundingTargets.push(...fundingTargets);
      existing.transactionCount++;
    } else {
      this.nodes.set(address, {
        address,
        firstSeen,
        transactionCount: 1,
        totalVolume: 0,
        fundingSources: [...fundingSources],
        fundingTargets: [...fundingTargets],
        buyTimestamps: []
      });
    }

    // Update adjacency list
    if (!this.adjacencyList.has(address)) {
      this.adjacencyList.set(address, new Set());
    }

    for (const source of fundingSources) {
      this.addEdge(source, address, 'funding', 0, firstSeen);
    }

    for (const target of fundingTargets) {
      this.addEdge(address, target, 'funding', 0, firstSeen);
    }
  }

  /**
   * Record a buy transaction
   */
  recordBuy(wallet: string, amount: number, timestamp: number): void {
    const node = this.nodes.get(wallet);
    if (node) {
      node.totalVolume += amount;
      node.buyTimestamps.push(timestamp);
    }
  }

  /**
   * Add an edge between wallets
   */
  addEdge(from: string, to: string, type: WalletEdge['type'], amount: number, timestamp: number): void {
    this.edges.push({ from, to, type, amount, timestamp });

    if (!this.adjacencyList.has(from)) {
      this.adjacencyList.set(from, new Set());
    }
    if (!this.adjacencyList.has(to)) {
      this.adjacencyList.set(to, new Set());
    }

    this.adjacencyList.get(from)!.add(to);
    this.adjacencyList.get(to)!.add(from);
  }

  /**
   * Find clusters of connected wallets
   */
  findClusters(): ClusterResult[] {
    const visited = new Set<string>();
    const clusters: ClusterResult[] = [];
    let clusterId = 0;

    for (const [address] of this.nodes) {
      if (!visited.has(address)) {
        const cluster = this.bfs(address, visited);
        
        if (cluster.length >= 2) {
          const result = this.analyzeCluster(cluster, `cluster_${clusterId++}`);
          clusters.push(result);
        }
      }
    }

    // Sort by suspicion score
    return clusters.sort((a, b) => b.suspicionScore - a.suspicionScore);
  }

  /**
   * BFS to find connected wallets
   */
  private bfs(start: string, visited: Set<string>): string[] {
    const queue = [start];
    const cluster: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);

      const neighbors = this.adjacencyList.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return cluster;
  }

  /**
   * Analyze a cluster for suspicious activity
   */
  private analyzeCluster(wallets: string[], clusterId: string): ClusterResult {
    const reasons: string[] = [];
    let suspicionScore = 0;

    // Get all nodes in cluster
    const clusterNodes = wallets.map(w => this.nodes.get(w)!).filter(Boolean);

    // 1. Check if all wallets are new
    const now = Date.now();
    const avgAge = clusterNodes.reduce((sum, n) => sum + (now - n.firstSeen), 0) / clusterNodes.length;
    const avgAgeHours = avgAge / (1000 * 60 * 60);

    if (avgAgeHours < 24) {
      reasons.push(`Cluster average age: ${avgAgeHours.toFixed(1)} hours (very new)`);
      suspicionScore += 30;
    } else if (avgAgeHours < 168) { // 1 week
      reasons.push(`Cluster average age: ${avgAgeHours.toFixed(1)} hours (new)`);
      suspicionScore += 15;
    }

    // 2. Check for common funding source
    const fundingSources = new Set<string>();
    for (const node of clusterNodes) {
      node.fundingSources.forEach(s => fundingSources.add(s));
    }

    // If there's a single source funding multiple wallets
    const sourceCount = new Map<string, number>();
    for (const node of clusterNodes) {
      for (const source of node.fundingSources) {
        sourceCount.set(source, (sourceCount.get(source) || 0) + 1);
      }
    }

    for (const [source, count] of sourceCount) {
      if (count >= 3) {
        reasons.push(`${count} wallets funded from same source: ${source.slice(0, 8)}...`);
        suspicionScore += 25;
      }
    }

    // 3. Check buy timing patterns
    const allBuyTimestamps: number[] = [];
    for (const node of clusterNodes) {
      allBuyTimestamps.push(...node.buyTimestamps);
    }
    allBuyTimestamps.sort((a, b) => a - b);

    if (allBuyTimestamps.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < allBuyTimestamps.length; i++) {
        intervals.push(allBuyTimestamps[i] - allBuyTimestamps[i - 1]);
      }

      // Check for suspiciously tight timing
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval < 60000) { // Less than 1 minute average
        reasons.push(`Buys within ${(avgInterval / 1000).toFixed(1)}s average interval`);
        suspicionScore += 35;
      }

      // Check for regular intervals (bot-like)
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < avgInterval * 0.1 && intervals.length >= 5) {
        reasons.push(`Suspiciously regular buy intervals (variance: ${stdDev.toFixed(0)}ms)`);
        suspicionScore += 25;
      }
    }

    // 4. Cluster size bonus
    if (wallets.length >= 10) {
      reasons.push(`Large cluster: ${wallets.length} connected wallets`);
      suspicionScore += 20;
    } else if (wallets.length >= 5) {
      reasons.push(`Medium cluster: ${wallets.length} connected wallets`);
      suspicionScore += 10;
    }

    // 5. Find center wallet (most connections)
    let centerWallet = wallets[0];
    let maxConnections = 0;
    for (const wallet of wallets) {
      const connections = this.adjacencyList.get(wallet)?.size || 0;
      if (connections > maxConnections) {
        maxConnections = connections;
        centerWallet = wallet;
      }
    }

    // Calculate total volume
    const totalVolume = clusterNodes.reduce((sum, n) => sum + n.totalVolume, 0);

    return {
      clusterId,
      wallets,
      centerWallet,
      totalVolume,
      avgAge: avgAgeHours,
      suspicionScore: Math.min(100, suspicionScore),
      reasons
    };
  }

  /**
   * Check if two wallets are connected
   */
  areConnected(wallet1: string, wallet2: string): boolean {
    const visited = new Set<string>();
    const queue = [wallet1];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current === wallet2) return true;
      if (visited.has(current)) continue;
      
      visited.add(current);
      
      const neighbors = this.adjacencyList.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return false;
  }

  /**
   * Get path between two wallets
   */
  findPath(wallet1: string, wallet2: string): string[] | null {
    const visited = new Set<string>();
    const queue: { wallet: string; path: string[] }[] = [{ wallet: wallet1, path: [wallet1] }];

    while (queue.length > 0) {
      const { wallet, path } = queue.shift()!;
      
      if (wallet === wallet2) return path;
      if (visited.has(wallet)) continue;
      
      visited.add(wallet);
      
      const neighbors = this.adjacencyList.get(wallet) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ wallet: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return null;
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    totalNodes: number;
    totalEdges: number;
    avgConnections: number;
    largestCluster: number;
  } {
    let totalConnections = 0;
    let largestCluster = 0;

    const visited = new Set<string>();
    for (const [address] of this.nodes) {
      totalConnections += this.adjacencyList.get(address)?.size || 0;
      
      if (!visited.has(address)) {
        const cluster = this.bfs(address, visited);
        if (cluster.length > largestCluster) {
          largestCluster = cluster.length;
        }
      }
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      avgConnections: this.nodes.size > 0 ? totalConnections / this.nodes.size : 0,
      largestCluster
    };
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.adjacencyList.clear();
  }
}

export const walletGraph = new WalletGraphAnalyzer();
