import { services } from '@wix/bookings';
import { members } from '@wix/members';
import { plans, orders } from '@wix/pricing-plans';
import { extendedBookings } from '@wix/bookings';
import { createClient, ApiKeyStrategy } from '@wix/sdk';
import dotenv from 'dotenv';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file if it exists
dotenv.config();

// Get the Wix API key and site ID from environment variables
const apiKey = process.env.WIX_API_KEY;
const siteId = process.env.WIX_SITE_ID;

// Create a directory for CSV files if it doesn't exist
const csvDir = './csv_exports';
if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir);
}

if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
  console.error('Error: WIX_API_KEY environment variable is not set or has default value.');
  console.error('Please create a .env file in the root directory with the following content:');
  console.error('WIX_API_KEY=your_actual_api_key');
  console.error('WIX_SITE_ID=your_site_id');
  process.exit(1);
}

if (!siteId || siteId === 'YOUR_SITE_ID_HERE') {
  console.error('Error: WIX_SITE_ID environment variable is not set or has default value.');
  console.error('Please update your .env file with your actual site ID:');
  console.error('WIX_SITE_ID=your_site_id');
  process.exit(1);
}

// Create a client with API Key strategy for all operations
const apiClient = createClient({
  modules: { services, members, plans, orders, extendedBookings },
  auth: ApiKeyStrategy({ 
    apiKey: apiKey,
    siteId: siteId 
  }),
});

// Wrap the API call in a try/catch block to handle errors
async function getServices() {
  try {
    const serviceList = await apiClient.services.queryServices().find();

    console.log('My Services:');
    console.log('Total: ', serviceList.items.length);
    console.log(serviceList.items
      .map((item) => item.name)
      .join('\n')
    );
    
    // Export to CSV
    if (serviceList.items && serviceList.items.length > 0) {
      const csvWriter = createObjectCsvWriter({
        path: path.join(csvDir, 'services.csv'),
        header: [
          { id: '_id', title: 'ID' },
          { id: 'name', title: 'Service Name' },
          { id: 'type', title: 'Type' },
          { id: 'categoryId', title: 'Category ID' },
          { id: 'slug', title: 'Slug' },
          { id: 'status', title: 'Status' }
        ]
      });
      
      await csvWriter.writeRecords(serviceList.items);
      console.log(`CSV file created: ${path.join(csvDir, 'services.csv')}`);
    }
  } catch (error) {
    console.error('Error fetching services:', error.message);
    console.error('Make sure your Wix API key is correct and you have the necessary permissions.');
  }
}

// Function to retrieve members
async function getMembers() {
  try {
    const membersList = await apiClient.members.queryMembers().find();
    
    console.log('My Members:');
    console.log('Total: ', membersList.totalCount);
    console.log(membersList.items
      .map((member) => `${member.profile?.firstName || ''} ${member.profile?.lastName || ''} (${member.loginEmail}) - Slug: ${member.profile?.slug || 'N/A'}`)
      .join('\n')
    );
    
    // Export to CSV
    if (membersList.items && membersList.items.length > 0) {
      const csvData = membersList.items.map(member => ({
        id: member._id,
        email: member.loginEmail,
        firstName: member.profile?.firstName || '',
        lastName: member.profile?.lastName || '',
        slug: member.profile?.slug || '',
        status: member.status,
        createdDate: member.createdDate ? new Date(member.createdDate).toISOString() : ''
      }));
      
      const csvWriter = createObjectCsvWriter({
        path: path.join(csvDir, 'members.csv'),
        header: [
          { id: 'id', title: 'ID' },
          { id: 'email', title: 'Email' },
          { id: 'firstName', title: 'First Name' },
          { id: 'lastName', title: 'Last Name' },
          { id: 'slug', title: 'Slug' },
          { id: 'status', title: 'Status' },
          { id: 'createdDate', title: 'Created Date' }
        ]
      });
      
      await csvWriter.writeRecords(csvData);
      console.log(`CSV file created: ${path.join(csvDir, 'members.csv')}`);
    }
  } catch (error) {
    console.error('Error fetching members:', error.message);
    console.error('Make sure your Wix API key is correct and you have the necessary permissions.');
  }
}

// Function to retrieve orders
async function getOrders() {
  try {
    console.log('\nRetrieving orders using API Key authentication...');
    
    // Try to get orders using the API key for admin access
    console.log('\nAll Orders (Admin Access):');
    try {
      const allOrders = await apiClient.orders.managementListOrders();
      console.log('Total Orders: ', allOrders.orders?.length || 0);
      
      if (allOrders.orders && allOrders.orders.length > 0) {
        console.log(allOrders.orders
          .map((order) => {
            const planName = order.planName || 'Unnamed Plan';
            const status = order.status || 'Unknown Status';
            const startDate = order.startDate ? new Date(order.startDate).toLocaleDateString() : 'N/A';
            const endDate = order.endDate ? new Date(order.endDate).toLocaleDateString() : 'Ongoing';
            
            return `Plan: ${planName} | Status: ${status} | Start: ${startDate} | End: ${endDate}`;
          })
          .join('\n')
        );
        
        // Export orders to CSV
        const csvWriter = createObjectCsvWriter({
          path: path.join(csvDir, 'orders.csv'),
          header: [
            { id: '_id', title: 'Order ID' },
            { id: 'planId', title: 'Plan ID' },
            { id: 'planName', title: 'Plan Name' },
            { id: 'status', title: 'Status' },
            { id: 'startDate', title: 'Start Date' },
            { id: 'endDate', title: 'End Date' },
            { id: 'memberId', title: 'Member ID' },
            { id: 'price', title: 'Price' },
            { id: 'currency', title: 'Currency' }
          ]
        });
        
        const ordersData = allOrders.orders.map(order => ({
          _id: order._id,
          planId: order.planId,
          planName: order.planName || 'Unnamed Plan',
          status: order.status || 'Unknown Status',
          startDate: order.startDate ? new Date(order.startDate).toISOString() : 'N/A',
          endDate: order.endDate ? new Date(order.endDate).toISOString() : 'Ongoing',
          memberId: order.memberId,
          price: order.price?.value || '',
          currency: order.price?.currency || ''
        }));
        
        await csvWriter.writeRecords(ordersData);
        console.log(`CSV file created: ${path.join(csvDir, 'orders.csv')}`);
      } else {
        console.log('No orders found.');
      }
    } catch (orderError) {
      console.error('Error fetching orders:', orderError.message);
      if (orderError.message.includes('403')) {
        console.error('Permission denied (403) when accessing orders. This likely means:');
        console.error('1. Your API key does not have access to the Orders module');
        console.error('2. The API key may be incorrect or expired');
        console.error('3. Check your app permissions in the Wix Developer Center');
      }
    }
  } catch (error) {
    console.error('Error retrieving orders:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    console.error('Make sure your API key is correct and has the necessary permissions.');
  }
}

// Function to retrieve extended bookings
async function getExtendedBookings() {
  try {
    console.log('\nRetrieving extended bookings information...');
    
    // Define query parameters (empty for all bookings)
    const query = {};
    
    // Define options (pagination, sorting, etc.)
    const options = {
      // Optional: limit the number of results
      limit: 10,
      // Optional: sort by start date descending (newest first)
      sort: [{ fieldName: 'booking.startDate', order: 'DESC' }]
    };
    
    // Call the API with the correct format
    const extendedBookingsList = await apiClient.extendedBookings.queryExtendedBookings(query, options);
    
    console.log('Extended Bookings:');
    console.log('Total: ', extendedBookingsList.items?.length || 0);
    
    if (extendedBookingsList.items && extendedBookingsList.items.length > 0) {
      console.log(extendedBookingsList.items
        .map((booking) => {
          const bookingId = booking.booking?._id || 'Unknown ID';
          const serviceName = booking.service?.name || 'Unknown Service';
          const customerName = booking.contact?.contactDetails?.firstName 
            ? `${booking.contact.contactDetails.firstName} ${booking.contact.contactDetails.lastName || ''}`
            : 'Unknown Customer';
          const startTime = booking.booking?.startDate 
            ? new Date(booking.booking.startDate).toLocaleString() 
            : 'Unknown Time';
          const status = booking.booking?.status || 'Unknown Status';
          const paymentStatus = booking.payment?.status || 'Unknown Payment Status';
          
          return `ID: ${bookingId} | Service: ${serviceName} | Customer: ${customerName} | Time: ${startTime} | Status: ${status} | Payment: ${paymentStatus}`;
        })
        .join('\n')
      );
      
      // Export bookings to CSV
      const csvWriter = createObjectCsvWriter({
        path: path.join(csvDir, 'bookings.csv'),
        header: [
          { id: 'bookingId', title: 'Booking ID' },
          { id: 'serviceName', title: 'Service Name' },
          { id: 'customerName', title: 'Customer Name' },
          { id: 'customerEmail', title: 'Customer Email' },
          { id: 'startTime', title: 'Start Time' },
          { id: 'endTime', title: 'End Time' },
          { id: 'status', title: 'Status' },
          { id: 'paymentStatus', title: 'Payment Status' },
          { id: 'price', title: 'Price' },
          { id: 'currency', title: 'Currency' }
        ]
      });
      
      const bookingsData = extendedBookingsList.items.map(booking => ({
        bookingId: booking.booking?._id || 'Unknown ID',
        serviceName: booking.service?.name || 'Unknown Service',
        customerName: booking.contact?.contactDetails?.firstName 
          ? `${booking.contact.contactDetails.firstName} ${booking.contact.contactDetails.lastName || ''}`
          : 'Unknown Customer',
        customerEmail: booking.contact?.contactDetails?.email || '',
        startTime: booking.booking?.startDate ? new Date(booking.booking.startDate).toISOString() : '',
        endTime: booking.booking?.endDate ? new Date(booking.booking.endDate).toISOString() : '',
        status: booking.booking?.status || 'Unknown Status',
        paymentStatus: booking.payment?.status || 'Unknown Payment Status',
        price: booking.payment?.price?.value || '',
        currency: booking.payment?.price?.currency || ''
      }));
      
      await csvWriter.writeRecords(bookingsData);
      console.log(`CSV file created: ${path.join(csvDir, 'bookings.csv')}`);
      
      // Display more detailed information about the first booking
      if (extendedBookingsList.items.length > 0) {
        const firstBooking = extendedBookingsList.items[0];
        console.log('\nDetailed information for first booking:');
        console.log(JSON.stringify(firstBooking, null, 2));
        
        // Export detailed first booking to CSV (as a separate file)
        // Flatten the complex object for CSV export
        const flattenObject = (obj, prefix = '') => {
          return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? `${prefix}.` : '';
            if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
              Object.assign(acc, flattenObject(obj[k], `${pre}${k}`));
            } else if (Array.isArray(obj[k])) {
              // For arrays, we'll just stringify them
              acc[`${pre}${k}`] = JSON.stringify(obj[k]);
            } else {
              acc[`${pre}${k}`] = obj[k];
            }
            return acc;
          }, {});
        };
        
        const flatBooking = flattenObject(firstBooking);
        const headers = Object.keys(flatBooking).map(key => ({ id: key, title: key }));
        
        const detailedCsvWriter = createObjectCsvWriter({
          path: path.join(csvDir, 'booking_detailed.csv'),
          header: headers
        });
        
        await detailedCsvWriter.writeRecords([flatBooking]);
        console.log(`Detailed CSV file created: ${path.join(csvDir, 'booking_detailed.csv')}`);
      }
    } else {
      console.log('No bookings found.');
    }
  } catch (error) {
    console.error('Error fetching extended bookings:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    console.error('Make sure your API key is correct and has the necessary permissions for the Bookings module.');
  }
}

// Function to retrieve subscription data from pricing plans
async function getSubscriptions() {
  try {
    console.log('\nRetrieving subscription data from pricing plans...');
    
    // Use the API Key client for these operations
    try {
      // First, get all plans to understand what subscription plans are available
      const plansList = await apiClient.plans.listPlans();
      console.log('Available Plans:');
      console.log('Total Plans: ', plansList.plans?.length || 0);
      
      // Create a map of plan IDs to plan names for easy reference
      const planMap = {};
      if (plansList.plans && plansList.plans.length > 0) {
        plansList.plans.forEach(plan => {
          planMap[plan._id] = plan.name;
        });
      }
      
      // Get all members to correlate with orders
      const membersList = await apiClient.members.queryMembers().find();
      console.log(`Total Members: ${membersList.totalCount}`);
      
      // Create a map of member IDs to member info for easy reference
      const memberMap = {};
      if (membersList.items && membersList.items.length > 0) {
        membersList.items.forEach(member => {
          memberMap[member._id] = {
            email: member.loginEmail,
            firstName: member.profile?.firstName || '',
            lastName: member.profile?.lastName || '',
            fullName: `${member.profile?.firstName || ''} ${member.profile?.lastName || ''}`.trim() || 'Unknown Name'
          };
        });
      }
      
      // Now get all orders which include subscription information
      const allOrders = await apiClient.orders.managementListOrders();
      console.log('Orders (Including Subscriptions):');
      console.log('Total Orders: ', allOrders.orders?.length || 0);
      
      if (allOrders.orders && allOrders.orders.length > 0) {
        // Filter for orders that are active subscriptions
        const subscriptionOrders = allOrders.orders.filter(order => 
          // Look for active subscriptions
          order.status === 'ACTIVE' || 
          order.status === 'PENDING' || 
          order.recurring === true
        );
        
        console.log(`Found ${subscriptionOrders.length} subscription orders`);
        
        if (subscriptionOrders.length > 0) {
          // Log a sample order to see its structure
          // console.log('\nSample order structure:');  
          // console.log(JSON.stringify(subscriptionOrders[0], null, 2));
          
          console.log(subscriptionOrders
            .map((order) => {
              const planName = planMap[order.planId] || order.planName || 'Unnamed Plan';
              const status = order.status || 'Unknown Status';
              const startDate = order.startDate ? new Date(order.startDate).toLocaleDateString() : 'N/A';
              const endDate = order.endDate ? new Date(order.endDate).toLocaleDateString() : 'Ongoing';
              
              // Use order.buyer.memberId to identify the buyer
              const buyerMemberId = order.buyer?.memberId || order.memberId || 'Unknown Member';
              const memberInfo = memberMap[buyerMemberId] || { fullName: 'Unknown Member', email: 'Unknown Email' };
              
              const price = order.price?.value || 'Unknown Amount';
              const currency = order.price?.currency || 'Unknown Currency';
              
              return `Plan: ${planName} | Status: ${status} | Start: ${startDate} | End: ${endDate} | Buyer: ${memberInfo.fullName} (${memberInfo.email}) | Price: ${price} ${currency}`;
            })
            .join('\n')
          );
          
          // Export subscription orders to CSV
          const csvWriter = createObjectCsvWriter({
            path: path.join(csvDir, 'subscriptions.csv'),
            header: [
              { id: '_id', title: 'Order ID' },
              { id: 'planId', title: 'Plan ID' },
              { id: 'planName', title: 'Plan Name' },
              { id: 'status', title: 'Status' },
              { id: 'startDate', title: 'Start Date' },
              { id: 'endDate', title: 'End Date' },
              { id: 'buyerMemberId', title: 'Buyer Member ID' },
              { id: 'buyerName', title: 'Buyer Name' },
              { id: 'buyerEmail', title: 'Buyer Email' },
              { id: 'price', title: 'Price' },
              { id: 'currency', title: 'Currency' },
              { id: 'paymentMethod', title: 'Payment Method' },
              { id: 'recurring', title: 'Recurring' },
              { id: 'autoRenew', title: 'Auto Renew' }
            ]
          });
          
          const subscriptionsData = subscriptionOrders.map(order => {
            // Use order.buyer.memberId to identify the buyer
            const buyerMemberId = order.buyer?.memberId || order.memberId || '';
            const memberInfo = memberMap[buyerMemberId] || { fullName: '', email: '' };
            
            return {
              _id: order._id,
              planId: order.planId,
              planName: planMap[order.planId] || order.planName || 'Unnamed Plan',
              status: order.status || 'Unknown Status',
              startDate: order.startDate ? new Date(order.startDate).toISOString() : '',
              endDate: order.endDate ? new Date(order.endDate).toISOString() : '',
              buyerMemberId: buyerMemberId,
              buyerName: memberInfo.fullName,
              buyerEmail: memberInfo.email,
              price: order.price?.value || '',
              currency: order.price?.currency || '',
              paymentMethod: order.paymentMethod || '',
              recurring: order.recurring ? 'Yes' : 'No',
              autoRenew: order.autoRenew ? 'Yes' : 'No'
            };
          });
          
          await csvWriter.writeRecords(subscriptionsData);
          console.log(`CSV file created: ${path.join(csvDir, 'subscriptions.csv')}`);
          
          // If there's at least one subscription order, get detailed information about it
          if (subscriptionOrders.length > 0) {
            try {
              const firstOrderId = subscriptionOrders[0]._id;
              console.log(`\nFetching detailed information for subscription order: ${firstOrderId}`);
              
              // Get detailed order information
              const orderDetails = await apiClient.orders.managementGetOrder(firstOrderId);
              // console.log('\nDetailed information for first subscription:');
              // console.log(JSON.stringify(orderDetails, null, 2));
            } catch (detailError) {
              console.error('Error fetching detailed order information:', detailError.message);
            }
          }
        } else {
          console.log('No subscription orders found.');
        }
      } else {
        console.log('No orders found.');
      }
    } catch (subscriptionsError) {
      console.error('Error fetching subscription data:', subscriptionsError.message);
      if (subscriptionsError.message.includes('403')) {
        console.error('Permission denied (403) when accessing pricing plans. This likely means:');
        console.error('1. Your API key does not have access to the Pricing Plans module');
        console.error('2. The API key may be incorrect or expired');
        console.error('3. Check your app permissions in the Wix Developer Center');
      }
    }
  } catch (error) {
    console.error('Error retrieving subscription data:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    console.error('Make sure your API key is correct and has the necessary permissions.');
  }
}

// Function to collect subscriptions for each member
async function getMemberSubscriptions() {
  try {
    console.log('\nCollecting subscriptions for each member...');
    
    // Use the API Key client for these operations
    try {
      // First, get all plans to understand what subscription plans are available
      const plansList = await apiClient.plans.listPlans();
      
      // Create a map of plan IDs to plan names for easy reference
      const planMap = {};
      if (plansList.plans && plansList.plans.length > 0) {
        plansList.plans.forEach(plan => {
          planMap[plan._id] = plan.name;
        });
      }
      
      // Get all members
      const membersList = await apiClient.members.queryMembers().find();
      console.log(`Total Members: ${membersList.totalCount}`);
      
      // Create a map of member IDs to member info for easy reference
      const memberMap = {};
      if (membersList.items && membersList.items.length > 0) {
        membersList.items.forEach(member => {
          memberMap[member._id] = {
            email: member.loginEmail,
            firstName: member.profile?.firstName || '',
            lastName: member.profile?.lastName || '',
            fullName: `${member.profile?.firstName || ''} ${member.profile?.lastName || ''}`.trim() || 'Unknown Name'
          };
        });
      }
      
      // Get all orders which include subscription information
      const allOrders = await apiClient.orders.managementListOrders();
      
      // Filter for active subscriptions
      const subscriptionOrders = allOrders.orders && allOrders.orders.length > 0 
        ? allOrders.orders.filter(order => 
            // Look for active subscriptions
            order.status === 'ACTIVE' || 
            order.status === 'PENDING' || 
            order.recurring === true
          )
        : [];
      
      // Group subscriptions by member ID
      const memberSubscriptions = {};
      
      subscriptionOrders.forEach(order => {
        // Use order.buyer.memberId to identify the buyer
        const memberId = order.buyer?.memberId || order.memberId;
        if (!memberId) return; // Skip if no member ID
        
        if (!memberSubscriptions[memberId]) {
          memberSubscriptions[memberId] = {
            memberId: memberId,
            memberInfo: memberMap[memberId] || { fullName: 'Unknown Member', email: 'Unknown Email' },
            subscriptions: []
          };
        }
        
        memberSubscriptions[memberId].subscriptions.push({
          orderId: order._id,
          planId: order.planId,
          planName: planMap[order.planId] || order.planName || 'Unnamed Plan',
          status: order.status || 'Unknown Status',
          startDate: order.startDate ? new Date(order.startDate) : null,
          endDate: order.endDate ? new Date(order.endDate) : null,
          price: order.price?.value || '',
          currency: order.price?.currency || '',
          autoRenew: order.autoRenew || false
        });
      });
      
      // Convert to array for easier processing
      const memberSubscriptionsArray = Object.values(memberSubscriptions);
      
      // Display summary
      console.log(`\nFound ${memberSubscriptionsArray.length} members with subscriptions`);
      
      if (memberSubscriptionsArray.length > 0) {
        // Display each member and their subscriptions
        memberSubscriptionsArray.forEach(member => {
          console.log(`\n${member.memberInfo.fullName} (${member.memberInfo.email})`);
          console.log(`Total Subscriptions: ${member.subscriptions.length}`);
          
          member.subscriptions.forEach((sub, index) => {
            const startDate = sub.startDate ? sub.startDate.toLocaleDateString() : 'N/A';
            const endDate = sub.endDate ? sub.endDate.toLocaleDateString() : 'Ongoing';
            console.log(`  ${index + 1}. ${sub.planName} | Status: ${sub.status} | Start: ${startDate} | End: ${endDate} | Price: ${sub.price} ${sub.currency}`);
          });
        });
        
        // Export member subscriptions to CSV
        const csvWriter = createObjectCsvWriter({
          path: path.join(csvDir, 'member_subscriptions.csv'),
          header: [
            { id: 'memberId', title: 'Member ID' },
            { id: 'memberName', title: 'Member Name' },
            { id: 'memberEmail', title: 'Member Email' },
            { id: 'subscriptionCount', title: 'Subscription Count' },
            { id: 'activePlans', title: 'Active Plans' },
            { id: 'totalValue', title: 'Total Value' },
            { id: 'currency', title: 'Currency' }
          ]
        });
        
        const memberSubscriptionsData = memberSubscriptionsArray.map(member => {
          // Calculate total value of all active subscriptions
          let totalValue = 0;
          let currency = '';
          const activePlans = [];
          
          member.subscriptions.forEach(sub => {
            if (sub.status === 'ACTIVE') {
              if (sub.price && !isNaN(parseFloat(sub.price))) {
                totalValue += parseFloat(sub.price);
                currency = sub.currency;
              }
              activePlans.push(sub.planName);
            }
          });
          
          return {
            memberId: member.memberId,
            memberName: member.memberInfo.fullName,
            memberEmail: member.memberInfo.email,
            subscriptionCount: member.subscriptions.length,
            activePlans: activePlans.join(', '),
            totalValue: totalValue.toFixed(2),
            currency: currency
          };
        });
        
        await csvWriter.writeRecords(memberSubscriptionsData);
        console.log(`\nCSV file created: ${path.join(csvDir, 'member_subscriptions.csv')}`);
        
        // Also export detailed subscription data for each member
        const detailedCsvWriter = createObjectCsvWriter({
          path: path.join(csvDir, 'member_subscriptions_detailed.csv'),
          header: [
            { id: 'memberId', title: 'Member ID' },
            { id: 'memberName', title: 'Member Name' },
            { id: 'memberEmail', title: 'Member Email' },
            { id: 'orderId', title: 'Order ID' },
            { id: 'planId', title: 'Plan ID' },
            { id: 'planName', title: 'Plan Name' },
            { id: 'status', title: 'Status' },
            { id: 'startDate', title: 'Start Date' },
            { id: 'endDate', title: 'End Date' },
            { id: 'price', title: 'Price' },
            { id: 'currency', title: 'Currency' },
            { id: 'autoRenew', title: 'Auto Renew' }
          ]
        });
        
        const detailedData = [];
        memberSubscriptionsArray.forEach(member => {
          member.subscriptions.forEach(sub => {
            detailedData.push({
              memberId: member.memberId,
              memberName: member.memberInfo.fullName,
              memberEmail: member.memberInfo.email,
              orderId: sub.orderId,
              planId: sub.planId,
              planName: sub.planName,
              status: sub.status,
              startDate: sub.startDate ? sub.startDate.toISOString() : '',
              endDate: sub.endDate ? sub.endDate.toISOString() : '',
              price: sub.price,
              currency: sub.currency,
              autoRenew: sub.autoRenew ? 'Yes' : 'No'
            });
          });
        });
        
        await detailedCsvWriter.writeRecords(detailedData);
        console.log(`CSV file created: ${path.join(csvDir, 'member_subscriptions_detailed.csv')}`);
      } else {
        console.log('No members with subscriptions found.');
      }
    } catch (error) {
      console.error('Error collecting member subscriptions:', error.message);
      if (error.message.includes('403')) {
        console.error('Permission denied (403). This likely means:');
        console.error('1. Your API key does not have access to the required modules');
        console.error('2. The API key may be incorrect or expired');
        console.error('3. Check your app permissions in the Wix Developer Center');
      }
    }
  } catch (error) {
    console.error('Error in getMemberSubscriptions:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Main function to run all functions in sequence and exit when complete
async function main() {
  try {
    console.log('Starting Wix API Tests...\n');
    
    console.log('=== Services ===');
    await getServices();
    
    console.log('\n=== Members ===');
    await getMembers();
    
    console.log('\n=== Orders ===');
    await getOrders();
    
    console.log('\n=== Extended Bookings ===');
    await getExtendedBookings();
    
    console.log('\n=== Subscriptions ===');
    await getSubscriptions();
    
    console.log('\n=== Member Subscriptions ===');
    await getMemberSubscriptions();
    
    console.log('\nAll tests completed successfully!');
    
    // Exit the process with success code
    process.exit(0);
  } catch (error) {
    console.error('Error in main function:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    // Exit the process with error code
    process.exit(1);
  }
}

// Run the main function
main();
