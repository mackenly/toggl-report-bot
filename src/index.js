export default {
	async fetch(request, env, ctx) {
		// get the startDate and endDate from the query string
		let url = new URL(request.url);
		let startDate = new Date(url.searchParams.get('startDate'));
		let endDate = new Date(url.searchParams.get('endDate'));
		let timeEntries = [];

		console.log(url.searchParams.get('startDate'), url.searchParams.get('endDate'), url, url.searchParams);
		// if the startDate and endDate are not valid dates, return an error
		if (isNaN(startDate) || isNaN(endDate)) {
			return new Response(
				JSON.stringify({
					error: 'Invalid date',
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);
		}

		console.log(startDate, endDate);

		await fetch(
			`https://api.track.toggl.com/api/v9/me/time_entries?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
			{
				headers: {
					'Context-Type': 'application/json',
					Authorization: 'Basic ' + btoa(env.TOGGL_AUTH),
				},
			}
		)
			.then((response) => response.json())
			.then((data) => {
				data.forEach((item) => {
					if (item.duration > 0 && item.workspace_id == env.WORKSPACE_IDENTIFIER) {
						timeEntries.push({
							id: item.id,
							workspace_id: item.workspace_id,
							project_id: item.project_id,
							task_id: item.task_id,
							billable: item.billable,
							start: item.start,
							end: item.end,
							description: item.description,
							duration: item.duration,
							tags: item.tags,
							tag_ids: item.tag_ids,
							duronly: item.duronly,
							at: item.at,
							server_deleted_at: item.server_deleted_at,
							user_id: item.user_id,
							uid: item.uid,
							wid: item.wid,
							pid: item.pid,
						});
					}
				});
			});

		let totals = [];
		// go through each time entry group by project id summing the duration and adding to totals
		timeEntries.forEach((item) => {
			let index = totals.findIndex((x) => x.project_id === item.project_id);
			if (index === -1) {
				totals.push({
					project_id: item.project_id,
					duration: item.duration,
				});
			} else {
				totals[index].duration += item.duration;
			}
		});

		// go through each total and convert duration to hours
		totals.forEach((item) => {
			item.duration = item.duration / 3600;
			item.durationFormatted = {
				hours: Math.floor(item.duration),
				minutes: Math.floor((item.duration % 1) * 60),
				seconds: Math.floor((((item.duration % 1) * 60) % 1) * 60),
				milliseconds: Math.floor((((((item.duration % 1) * 60) % 1) * 60) % 1) * 1000),
			};
			item.cost = parseFloat(env.HOURLY_RATE) * item.duration;
		});

		// add the project name to each total by making a call to the toggl api
		for (let i = 0; i < totals.length; i++) {
			await fetch('https://api.track.toggl.com/api/v9/workspaces/' + env.WORKSPACE_IDENTIFIER + '/projects/' + totals[i].project_id, {
				headers: {
					'Context-Type': 'application/json',
					Authorization: 'Basic ' + btoa(env.TOGGL_AUTH),
				},
			})
				.then((response) => response.json())
				.then((data) => {
					totals[i].project_name = data.name;
				});
		}

		// need to troubleshoot the api responses? Use this:
		/*return new Response(
			JSON.stringify({
				startDate: startDate,
				endDate: endDate,
				totals: totals,
				timeEntries: timeEntries,
				summary: {
					total_hours: totals.reduce((a, b) => a + b.duration, 0),
					hourly_rate: parseFloat(env.HOURLY_RATE),
					total_cost: totals.reduce((a, b) => a + b.cost, 0),
				},
			}),
			{
				headers: { 'content-type': 'application/json' },
			}
		);*/

		const html = `
		<!DOCTYPE html><html lang='en'><head> <meta charset='UTF-8'> <meta http-equiv='X-UA-Compatible' content='IE=edge'> <meta name='viewport' content='width=device-width, initial-scale=1.0'> <title>${
			env.YOUR_NAME
		}'s Timesheet for ${startDate.getMonth() + 1}/${startDate.getDate()}/${startDate.getFullYear()} - ${
			endDate.getMonth() + 1
		}/${endDate.getDate()}/${endDate.getFullYear()}</title></head><body> <style> 
		body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; max-width: 1080px; margin: 20px auto; } header { margin-bottom: 20px; } #meta { display: flex; justify-content: space-between; } h1 { font-size: 35px; margin-bottom: 10px; } p { margin: 0; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; } tr:nth-child(even) { background-color: #f2f2f2; } tr:hover { background-color: #ddd; } 
		th { padding-top: 12px; padding-bottom: 12px; text-align: left; background-color: #4CAF50; color: white; } #totals { margin-top: 20px; font-size: 16px; max-width: fit-content; margin-left: auto; padding: 10px; border: 1px solid rgb(192, 192, 192); } #totals p { margin: 5px 0; display: flex; justify-content: space-between; } #totals p span { margin-left: 20px; } section { margin-top: 20px; } #options {position: fixed;bottom: 10px;left: 50%;transform: translateX(-50%);height: 30px;display: flex;justify-content: space-between;align-items: center;gap: 10px;padding: 15px;border-radius: 50px;background-color: #4CAF50;} #options button,#options a {padding: 10px;border-radius: 5px;text-decoration: none;border: 0px solid transparent;background-color: transparent;color: #4CAF50;font-size: 16px;cursor: pointer;} #options svg { fill: #fff; padding-top: 5px;border: 2px solid transparent; } #options button:hover svg,#options button:active svg,#options a:hover svg,#options a:active svg {box-shadow: 0 0 50px 2px #fff;border-radius: 18px;background-color: rgba(255, 255, 255, 0.278);} footer { margin-top: 20px; } /* print styles */ 
		@media print { a {  color: #000 !important;  text-decoration: none !important; } } </style> <header> <h1>${env.YOUR_NAME} ${
			env.CLIENT_NAME
		} Invoice</h1> <div id='meta'> <div>  <p>  <b>Client: </b> <span>${
			env.CLIENT_NAME
		}</span>  </p>  <p>  <b>Invoice Date: </b> <span>${new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		})}</span>  </p>  <p>  <b>Invoice Period: </b> <span>${startDate.getMonth() + 1}/${startDate.getDate()}/
		${startDate.getFullYear()} - ${
			endDate.getMonth() + 1
		}/${endDate.getDate()}/${endDate.getFullYear()}</span>  </p> </div> <div>  <p>  <b>Contractor: </b> <span>${
			env.YOUR_NAME
		}</span>  </p>  <p>  <b>Email: </b> <span>${env.YOUR_EMAIL}</span>  </p>  <p>  <b> Phone: </b> <span>${
			env.YOUR_PHONE
		}</span>  </p>  <p>  <b>Address: </b> <span>${env.YOUR_ADDRESS}</span>  </p> </div> </div> </header> <section> 
		<table> <tr>  <th>Project/Task</th>  <th>Hours</th> </tr>${totals.map(
			(total) =>
				`<tr><td>${total.project_name}</td><td>${total.durationFormatted.hours || '00'}:${
					total.durationFormatted.minutes || '00'
				}:${total.durationFormatted.seconds || '00'}</td></tr>`
		)} </table> </section> <section id='totals'> <p> <b>Total Hours: </b> <span>~${totals
			.reduce((a, b) => a + b.duration, 0)
			.toFixed(2)}</span> </p> <p> <b>Hourly Rate: </b> 
		<span>$${parseFloat(env.HOURLY_RATE).toFixed(2)}</span> <p> <b>Amount Due: </b> <span>$${totals
			.reduce((a, b) => a + b.cost, 0)
			.toFixed(
				2
			)}</span> </p> </section> <section> <p> <b>Notice: </b>This invoice is dynamically generated from Toggl data and may be incomplete. The hour totals listed are rounded from the actual time tracked (in milliseconds). The total hours may be slightly off as a result. However, the amount due is calculated 
		off the exact milliseconds recorded. Please contact ${
			env.YOUR_NAME
		} if you have any questions or require clarification on any item. Thanks! </p> </section> <div id="options"><button onclick="window.print();"><svg xmlns="http://www.w3.org/2000/svg" height="34" width="34" viewBox="0 0 48 48"><path d="M32.9 15.6V9H15.1v6.6h-3V6h23.8v9.6ZM7 18.6h34-28.9Zm29.95 4.75q.6 0 1.05-.45.45-.45.45-1.05 0-.6-.45-1.05-.45-.45-1.05-.45-.6 0-1.05.45-.45.45-.45 1.05 0 .6.45 1.05.45.45 1.05.45ZM32.9 39v-9.6H15.1V39Zm3 3H12.1v-8.8H4V20.9q0-2.25 1.525-3.775T9.3 15.6h29.4q2.25 0 3.775 1.525T44 20.9v12.3h-8.1ZM41 30.2v-9.3q0-1-.65-1.65-.65-.65-1.65-.65H9.3q-1 0-1.65.65Q7 19.9 7 20.9v9.3h5.1v-3.8h23.8v3.8Z" /></svg></button><span style="height: 30px; border-left: 2px solid #fff;"></span><a href="mailto:test@example.com"><svg xmlns="http://www.w3.org/2000/svg" height="34" width="34" viewBox="0 0 48 48"><path d="M7 40q-1.2 0-2.1-.9Q4 38.2 4 37V11q0-1.2.9-2.1Q5.8 8 7 8h34q1.2 0 2.1.9.9.9.9 2.1v26q0 1.2-.9 2.1-.9.9-2.1.9Zm17-15.1L7 13.75V37h34V13.75Zm0-3L40.8 11H7.25ZM7 13.75V11v26Z" /></svg></a></div> <footer> <p>Copyright &copy; ${new Date().getFullYear()} <a href='https://mackenly.com'>Mackenly Jones</a></p> </footer></body></html>
		`;

		return new Response(html, {
			headers: { 'content-type': 'text/html' },
		});
	},

	async scheduled(event, env, ctx) {
		let today = new Date(),
			startDate,
			endDate,
			timeEntries = [];

		let lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
		if (today.getDate() <= 17) {
			// from first dat at midnight to 14th at 11:59:59
			startDate = new Date(today.getFullYear(), today.getMonth(), 1);
			endDate = new Date(today.getFullYear(), today.getMonth(), 14, 23, 59, 59);
		} else if (today.getDate() > 17 && today.getDate() <= lastDayOfMonth) {
			// from 15th at midnight to last day of the month at 11:59:59
			startDate = new Date(today.getFullYear(), today.getMonth(), 14);
			// determine the last day of the month
			endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
		} else {
			return new Response('Error: Invalid date');
		}

		// send an email to the user with a link to the invoice using mailgun
		const someHost = env.MAIL_BASE_URL;
		const fromEmail = `Invoices ${env.FROM_EMAIL}`;
		const invoiceLink = `https://${env.INVOICE_URL}/?startDate=${startDate.toISOString()}%26endDate=${endDate.toISOString()}`;
		const body = `Here is your invoice for the period of ${startDate.toDateString()} to ${endDate.toDateString()}. Please click the link below to view your invoice. ${invoiceLink}`;
		const subject = `${env.CLIENT_NAME} Invoice for ` + startDate.toDateString() + ' to ' + endDate.toDateString();
		const url = someHost + '/messages' + '?from=' + fromEmail + `&to=${env.TO_EMAIL}` + '&subject=' + subject + '&text=' + body;
		console.log(url);
		const init = {
			method: 'POST',
			headers: {
				Authorization: 'Basic ' + btoa('api:' + env.MAIL_API_KEY),
				'content-type': 'application/json;charset=UTF-8',
			},
		};
		const response = await fetch(url, init);

		return new Response('Invoice sent');
	},
};
